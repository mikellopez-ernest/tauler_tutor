function resolveTutorGroupForEmail_(email) {
  var registry = loadTableRegistry_();
  var teachersSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.teacherList);
  var leaveSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.leaveAbsence);
  var responsibilitiesSheet = openTableSheet_(registry, TABLES.teachingLoad, SHEETS.responsibilities);
  var teacherGroupsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.teacherGroups);
  var groupStudentSheetsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.groupStudentSheets);

  var teacher = findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, email);
  logInfo_('resolver_teacher_found', {
    email: email,
    teacherFullName: teacher.fullName,
    teacherCode: teacher.reduit,
    resolvedFromSubstitute: !!teacher.resolvedFromSubstitute
  });
  var responsibilities = findResponsibilitiesByTeacherFullName_(responsibilitiesSheet, teacher.fullName);
  var responsibility = combineResponsibilities_(responsibilities);
  logInfo_('resolver_responsibilities_found', {
    teacherFullName: teacher.fullName,
    responsibilityCount: responsibilities.length,
    responsibilities: responsibilities.map(function(item) { return item.name; })
  });
  var groups = findDinantiaGroupsByResponsibilities_(teacherGroupsSheet, groupStudentSheetsSheet, responsibilities);
  logInfo_('resolver_groups_found', {
    responsibilities: responsibilities.map(function(item) { return item.name; }),
    groupCount: groups.length,
    groups: groups.map(function(group) { return group.dinantiaGroupId; })
  });

  return {
    userEmail: email,
    teacher: teacher,
    responsibility: responsibility,
    responsibilities: responsibilities,
    dinantiaGroupId: groups.length === 1 ? groups[0].dinantiaGroupId : 'Tots els grups',
    studentDataSheetName: groups.length === 1 ? groups[0].studentDataSheetName : '',
    groups: groups,
    hasMultipleGroups: groups.length > 1,
    teacherLabel: buildTeacherLabel_(teacher)
  };
}

function findResponsibilitiesByTeacherFullName_(responsibilitiesSheet, fullName) {
  var headerMap = requireHeaders_(responsibilitiesSheet, [
    HEADERS.responsibilityName,
    HEADERS.responsibilityAssignee
  ], TABLES.teachingLoad + ' -> ' + SHEETS.responsibilities);
  var values = responsibilitiesSheet.getDataRange().getValues();
  var target = textKey_(fullName);

  var candidates = [];
  var matches = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var assignee = String(row[headerMap[HEADERS.responsibilityAssignee]] || '').trim();
    if (assignee) candidates.push({ row: i + 1, carrec: String(row[headerMap[HEADERS.responsibilityName]] || '').trim(), assignedTo: assignee });

    if (textKey_(assignee) === target) {
      matches.push({
        name: String(row[headerMap[HEADERS.responsibilityName]] || '').trim(),
        assignedTo: assignee,
        row: i + 1
      });
    }
  }

  if (matches.length) return matches;

  logWarn_('resolver_responsibility_missing', {
    teacherFullName: fullName,
    teacherFullNameKey: target,
    sampleAssignedRows: candidates.slice(0, 12)
  });
  throw tutorResolutionError_('No responsibility found for teacher full name: ' + fullName);
}

function combineResponsibilities_(responsibilities) {
  return {
    name: responsibilities.map(function(item) { return item.name; }).join(', '),
    assignedTo: responsibilities[0] ? responsibilities[0].assignedTo : ''
  };
}

function findDinantiaGroupsByResponsibilities_(teacherGroupsSheet, groupStudentSheetsSheet, responsibilities) {
  var allGroups = [];
  var seen = {};
  var skippedResponsibilities = [];
  responsibilities.forEach(function(responsibility) {
    var groups = findDinantiaGroupsByResponsibility_(teacherGroupsSheet, groupStudentSheetsSheet, responsibility.name, { allowMissingResponsibilityMapping: true });
    if (!groups.length) {
      skippedResponsibilities.push(responsibility.name);
      return;
    }
    groups.forEach(function(group) {
      var key = textKey_(group.dinantiaGroupId);
      if (seen[key]) return;
      seen[key] = true;
      allGroups.push({
        dinantiaGroupId: group.dinantiaGroupId,
        studentDataSheetName: group.studentDataSheetName,
        responsibilityName: responsibility.name
      });
    });
  });
  if (!allGroups.length) {
    throw tutorResolutionError_('No Dinantia group mapping found for any responsibility: ' + responsibilities.map(function(item) { return item.name; }).join(', '));
  }
  if (skippedResponsibilities.length) {
    logWarn_('resolver_responsibilities_without_group_mapping', {
      skippedResponsibilities: skippedResponsibilities
    });
  }
  return allGroups;
}

function findDinantiaGroupsByResponsibility_(teacherGroupsSheet, groupStudentSheetsSheet, responsibilityName, options) {
  var teacherGroupHeaderMap = requireHeaders_(teacherGroupsSheet, [
    HEADERS.classGroupTeacherResponsibility,
    HEADERS.classGroupDinantiaNames
  ], TABLES.dinantia + ' -> ' + SHEETS.teacherGroups);
  var teacherGroupValues = teacherGroupsSheet.getDataRange().getValues();
  var target = textKey_(responsibilityName);
  var groupNames = [];

  var availableCarrecs = [];
  for (var i = 1; i < teacherGroupValues.length; i++) {
    var row = teacherGroupValues[i];
    var carrec = String(row[teacherGroupHeaderMap[HEADERS.classGroupTeacherResponsibility]] || '').trim();
    if (carrec) availableCarrecs.push(carrec);

    if (textKey_(carrec) === target) {
      groupNames = parseDinantiaGroupNames_(row[teacherGroupHeaderMap[HEADERS.classGroupDinantiaNames]]);
      break;
    }
  }

  if (!groupNames.length) {
    logWarn_('resolver_teacher_group_mapping_missing', {
      responsibility: responsibilityName,
      responsibilityKey: target,
      availableCarrecs: availableCarrecs.slice(0, 40)
    });
    if (options && options.allowMissingResponsibilityMapping) {
      return [];
    }
    throw tutorResolutionError_('No Dinantia group mapping found for responsibility: ' + responsibilityName);
  }

  return mapDinantiaGroupsToStudentSheets_(groupStudentSheetsSheet, groupNames, responsibilityName);
}

function parseDinantiaGroupNames_(value) {
  var seen = {};
  return String(value || '').split(',').map(function(part) {
    return String(part || '').trim();
  }).filter(function(groupName) {
    if (!groupName || seen[groupName]) return false;
    seen[groupName] = true;
    return true;
  });
}

function mapDinantiaGroupsToStudentSheets_(groupStudentSheetsSheet, groupNames, responsibilityName) {
  var headerMap = requireHeaders_(groupStudentSheetsSheet, [
    HEADERS.classGroupDinantiaId,
    HEADERS.classGroupStudentDataSheet
  ], TABLES.dinantia + ' -> ' + SHEETS.groupStudentSheets);
  var values = groupStudentSheetsSheet.getDataRange().getValues();
  var byName = {};
  var groups = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var dinantiaGroupId = String(row[headerMap[HEADERS.classGroupDinantiaId]] || '').trim();
    var studentDataSheetName = String(row[headerMap[HEADERS.classGroupStudentDataSheet]] || '').trim();
    if (dinantiaGroupId) byName[textKey_(dinantiaGroupId)] = {
      dinantiaGroupId: dinantiaGroupId,
      studentDataSheetName: studentDataSheetName
    };
  }

  groupNames.forEach(function(groupName) {
    var mapped = byName[textKey_(groupName)];
    if (!mapped || !mapped.studentDataSheetName) {
      logWarn_('resolver_student_sheet_mapping_missing', {
        responsibility: responsibilityName,
        groupName: groupName,
        groupNameKey: textKey_(groupName)
      });
      throw tutorResolutionError_('Missing Dades alumnes sheet mapping for Dinantia group "' + groupName + '" in responsibility: ' + responsibilityName);
    }
    groups.push({
      dinantiaGroupId: mapped.dinantiaGroupId || groupName,
      studentDataSheetName: mapped.studentDataSheetName
    });
  });

  return groups;
}

function buildTeacherLabel_(teacher) {
  if (teacher.resolvedFromSubstitute) {
    return teacher.resolvedFromSubstitute.substituteFullName + ' (substituïnt ' + teacher.fullName + ')';
  }

  return teacher.fullName;
}
