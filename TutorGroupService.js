function resolveTutorGroupForEmail_(email) {
  var registry = loadTableRegistry_();
  var teachersSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.teacherList);
  var leaveSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.leaveAbsence);
  var responsibilitiesSheet = openTableSheet_(registry, TABLES.teachingLoad, SHEETS.responsibilities);
  var classGroupsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.classGroups);

  var teacher = findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, email);
  var responsibility = findResponsibilityByTeacherFullName_(responsibilitiesSheet, teacher.fullName);
  var dinantiaGroupId = findDinantiaGroupIdByResponsibility_(classGroupsSheet, responsibility.name);

  return {
    userEmail: email,
    teacher: teacher,
    responsibility: responsibility,
    dinantiaGroupId: dinantiaGroupId
  };
}

function findResponsibilityByTeacherFullName_(responsibilitiesSheet, fullName) {
  var headerMap = requireHeaders_(responsibilitiesSheet, [
    HEADERS.responsibilityName,
    HEADERS.responsibilityAssignee
  ], TABLES.teachingLoad + ' -> ' + SHEETS.responsibilities);
  var values = responsibilitiesSheet.getDataRange().getValues();
  var target = textKey_(fullName);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    if (textKey_(row[headerMap[HEADERS.responsibilityAssignee]]) === target) {
      return {
        name: String(row[headerMap[HEADERS.responsibilityName]] || '').trim(),
        assignedTo: String(row[headerMap[HEADERS.responsibilityAssignee]] || '').trim()
      };
    }
  }

  throw tutorResolutionError_('No responsibility found for teacher full name: ' + fullName);
}

function findDinantiaGroupIdByResponsibility_(classGroupsSheet, responsibilityName) {
  var headerMap = requireHeaders_(classGroupsSheet, [
    HEADERS.classGroupDinantiaId,
    HEADERS.classGroupTutorResponsibility
  ], TABLES.dinantia + ' -> ' + SHEETS.classGroups);
  var values = classGroupsSheet.getDataRange().getValues();
  var target = textKey_(responsibilityName);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    if (textKey_(row[headerMap[HEADERS.classGroupTutorResponsibility]]) === target) {
      var dinantiaGroupId = String(row[headerMap[HEADERS.classGroupDinantiaId]] || '').trim();
      if (!dinantiaGroupId) {
        throw tutorResolutionError_('Empty Dinantia group id for responsibility: ' + responsibilityName);
      }
      return dinantiaGroupId;
    }
  }

  throw tutorResolutionError_('No Dinantia group mapping found for responsibility: ' + responsibilityName);
}

