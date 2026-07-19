function buildResolverDebug_() {
  var debug = {
    enabled: true,
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    steps: []
  };

  try {
    var email = getCurrentUserEmail_();
    addDebugStep_(debug, 'Current user', 'OK', { email: email });

    var registry = loadTableRegistry_();
    addDebugStep_(debug, 'Registry', 'OK', { tables: Object.keys(registry).sort() });

    var teachersSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.teacherList);
    var leaveSheet = openTableSheet_(registry, TABLES.teachers, SHEETS.leaveAbsence);
    var responsibilitiesSheet = openTableSheet_(registry, TABLES.teachingLoad, SHEETS.responsibilities);
    var teacherGroupsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.teacherGroups);
    var groupStudentSheetsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.groupStudentSheets);
    addDebugStep_(debug, 'Sheets', 'OK', {
      teachers: TABLES.teachers + ' -> ' + SHEETS.teacherList,
      responsibilities: TABLES.teachingLoad + ' -> ' + SHEETS.responsibilities,
      teacherGroups: TABLES.dinantia + ' -> ' + SHEETS.teacherGroups,
      groupStudentSheets: TABLES.dinantia + ' -> ' + SHEETS.groupStudentSheets
    });

    var teacher = findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, email);
    addDebugStep_(debug, 'Teacher lookup', 'OK', {
      fullName: teacher.fullName,
      fullNameKey: textKey_(teacher.fullName),
      reduit: teacher.reduit,
      resolvedFromSubstitute: !!teacher.resolvedFromSubstitute
    });

    var responsibilityDebug = debugResponsibilityLookup_(responsibilitiesSheet, teacher.fullName);
    addDebugStep_(debug, 'Responsibility lookup', responsibilityDebug.found ? 'OK' : 'FAILED', responsibilityDebug);
    if (!responsibilityDebug.found) return debug;

    var responsibilityNames = (responsibilityDebug.responsibilities || []).map(function(item) { return item.name; });
    var teacherGroupDebug = debugTeacherGroupLookup_(teacherGroupsSheet, responsibilityNames);
    addDebugStep_(debug, 'Teacher to Dinantia groups', teacherGroupDebug.found ? 'OK' : 'FAILED', teacherGroupDebug);
    if (!teacherGroupDebug.found) return debug;

    var groupSheetDebug = debugGroupSheetLookup_(groupStudentSheetsSheet, teacherGroupDebug.groupNames);
    addDebugStep_(debug, 'Dinantia to Dades alumnes', groupSheetDebug.missing.length ? 'FAILED' : 'OK', groupSheetDebug);
  } catch (error) {
    addDebugStep_(debug, 'Debug collector', 'FAILED', {
      errorCode: error && error.code ? error.code : '',
      errorMessage: error && error.message ? error.message : String(error)
    });
  }

  return debug;
}

function debugResponsibilityLookup_(responsibilitiesSheet, fullName) {
  var headerMap = requireHeaders_(responsibilitiesSheet, [
    HEADERS.responsibilityName,
    HEADERS.responsibilityAssignee
  ], TABLES.teachingLoad + ' -> ' + SHEETS.responsibilities);
  var values = responsibilitiesSheet.getDataRange().getValues();
  var target = textKey_(fullName);
  var sample = [];
  var matches = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var assignee = String(row[headerMap[HEADERS.responsibilityAssignee]] || '').trim();
    var carrec = String(row[headerMap[HEADERS.responsibilityName]] || '').trim();
    if (assignee && sample.length < 25) {
      sample.push({ row: i + 1, carrec: carrec, assignedTo: assignee, assignedToKey: textKey_(assignee) });
    }
    if (textKey_(assignee) === target) {
      matches.push({ name: carrec, assignedTo: assignee, row: i + 1 });
    }
  }

  if (matches.length) {
    return {
      found: true,
      expectedFullName: fullName,
      expectedKey: target,
      responsibilityCount: matches.length,
      responsibilities: matches
    };
  }

  return {
    found: false,
    expectedFullName: fullName,
    expectedKey: target,
    sampleAssignedRows: sample
  };
}

function debugTeacherGroupLookup_(teacherGroupsSheet, responsibilityNames) {
  var headerMap = requireHeaders_(teacherGroupsSheet, [
    HEADERS.classGroupTeacherResponsibility,
    HEADERS.classGroupDinantiaNames
  ], TABLES.dinantia + ' -> ' + SHEETS.teacherGroups);
  var values = teacherGroupsSheet.getDataRange().getValues();
  var targets = {};
  (responsibilityNames || []).forEach(function(name) {
    targets[textKey_(name)] = name;
  });
  var available = [];
  var matches = [];
  var missingCarrecs = [];
  var groupNames = [];
  var seenGroups = {};

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var carrec = String(row[headerMap[HEADERS.classGroupTeacherResponsibility]] || '').trim();
    var groupText = String(row[headerMap[HEADERS.classGroupDinantiaNames]] || '').trim();
    if (carrec && available.length < 50) {
      available.push({ row: i + 1, carrec: carrec, carrecKey: textKey_(carrec), dinantia_group_names: groupText });
    }
    if (targets[textKey_(carrec)]) {
      var parsed = parseDinantiaGroupNames_(groupText);
      matches.push({
        expectedCarrec: targets[textKey_(carrec)],
        matchedCarrec: carrec,
        row: i + 1,
        rawGroupText: groupText,
        groupNames: parsed
      });
      parsed.forEach(function(groupName) {
        var key = textKey_(groupName);
        if (seenGroups[key]) return;
        seenGroups[key] = true;
        groupNames.push(groupName);
      });
    }
  }

  if (matches.length) {
    (responsibilityNames || []).forEach(function(name) {
      var key = textKey_(name);
      var matched = matches.some(function(match) { return textKey_(match.matchedCarrec) === key; });
      if (!matched) missingCarrecs.push(name);
    });
    return {
      found: true,
      expectedCarrecs: responsibilityNames || [],
      matches: matches,
      unmappedCarrecsIgnored: missingCarrecs,
      groupNames: groupNames
    };
  }

  return {
    found: false,
    expectedCarrecs: responsibilityNames || [],
    expectedKeys: Object.keys(targets),
    availableCarrecs: available
  };
}

function debugGroupSheetLookup_(groupStudentSheetsSheet, groupNames) {
  var headerMap = requireHeaders_(groupStudentSheetsSheet, [
    HEADERS.classGroupDinantiaId,
    HEADERS.classGroupStudentDataSheet
  ], TABLES.dinantia + ' -> ' + SHEETS.groupStudentSheets);
  var values = groupStudentSheetsSheet.getDataRange().getValues();
  var byKey = {};
  var available = [];
  var found = [];
  var missing = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var groupName = String(row[headerMap[HEADERS.classGroupDinantiaId]] || '').trim();
    var sheetName = String(row[headerMap[HEADERS.classGroupStudentDataSheet]] || '').trim();
    if (!groupName) continue;
    byKey[textKey_(groupName)] = { row: i + 1, groupName: groupName, sheetName: sheetName };
    if (available.length < 80) available.push({ row: i + 1, groupName: groupName, groupKey: textKey_(groupName), sheetName: sheetName });
  }

  (groupNames || []).forEach(function(groupName) {
    var mapped = byKey[textKey_(groupName)];
    if (mapped && mapped.sheetName) {
      found.push({ requested: groupName, matched: mapped.groupName, sheetName: mapped.sheetName, row: mapped.row });
    } else {
      missing.push({ requested: groupName, requestedKey: textKey_(groupName), matchedRowWithoutSheet: mapped || null });
    }
  });

  return {
    requestedGroups: groupNames || [],
    found: found,
    missing: missing,
    availableGroups: available
  };
}

function addDebugStep_(debug, step, status, details) {
  debug.steps.push({
    step: step,
    status: status,
    details: sanitizeLogDetails_(details || {})
  });
}
