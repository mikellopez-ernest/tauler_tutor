function findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, email) {
  var teacherByEmail = findTeacherByEmail_(teachersSheet, email);

  if (!teacherByEmail) {
    throw tutorResolutionError_('Teacher not found by ' + HEADERS.teacherEmail + ': ' + email);
  }

  if (!teacherByEmail.isSubstitute) {
    return teacherByEmail;
  }

  var activeLeave = findActiveLeaveBySubstituteCode_(leaveSheet, teacherByEmail.reduit);

  if (!activeLeave) {
    throw tutorResolutionError_(
      'Teacher is marked as substitute, but no active leave_absence row was found for substitute_code: ' +
      teacherByEmail.reduit
    );
  }

  var mainTeacher = findTeacherByReduit_(teachersSheet, activeLeave.teacherCode);

  if (!mainTeacher) {
    throw tutorResolutionError_(
      'Active leave_absence row found, but main teacher could not be resolved by ' +
      HEADERS.teacherCode + ': ' + activeLeave.teacherCode
    );
  }

  mainTeacher.resolvedFromSubstitute = {
    substituteEmail: email,
    substituteReduit: teacherByEmail.reduit,
    substituteFullName: teacherByEmail.fullName,
    leaveTeacherCode: activeLeave.teacherCode,
    leaveSubstituteCode: activeLeave.substituteCode,
    leaveStartDate: activeLeave.startDate,
    leaveEndDate: activeLeave.endDate
  };

  return mainTeacher;
}

function findTeacherByEmail_(teachersSheet, email) {
  var headerMap = requireHeaders_(teachersSheet, [
    HEADERS.teacherEmail,
    HEADERS.teacherCode,
    HEADERS.teacherFirstName,
    HEADERS.teacherSurname1,
    HEADERS.teacherSurname2,
    HEADERS.teacherSubstitute
  ], TABLES.teachers + ' -> ' + SHEETS.teacherList);
  var values = teachersSheet.getDataRange().getValues();
  var targetEmail = String(email || '').trim().toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowEmail = String(row[headerMap[HEADERS.teacherEmail]] || '').trim().toLowerCase();

    if (rowEmail === targetEmail) {
      return teacherFromRow_(row, headerMap);
    }
  }

  return null;
}

function findTeacherByReduit_(teachersSheet, reduit) {
  var headerMap = requireHeaders_(teachersSheet, [
    HEADERS.teacherCode,
    HEADERS.teacherFirstName,
    HEADERS.teacherSurname1,
    HEADERS.teacherSurname2,
    HEADERS.teacherSubstitute
  ], TABLES.teachers + ' -> ' + SHEETS.teacherList);
  var values = teachersSheet.getDataRange().getValues();
  var target = codeKey_(reduit);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    if (codeKey_(row[headerMap[HEADERS.teacherCode]]) === target) {
      return teacherFromRow_(row, headerMap);
    }
  }

  return null;
}

function teacherFromRow_(row, headerMap) {
  return {
    reduit: String(row[headerMap[HEADERS.teacherCode]] || '').trim(),
    fullName: fullNameFromTeacherRow_(row, headerMap),
    isSubstitute: isTrue_(row[headerMap[HEADERS.teacherSubstitute]])
  };
}

function findActiveLeaveBySubstituteCode_(leaveSheet, substituteReduit) {
  var headerMap = requireHeaders_(leaveSheet, [
    HEADERS.leaveTeacherCode,
    HEADERS.leaveSubstituteCode,
    HEADERS.leaveStartDate,
    HEADERS.leaveEndDate
  ], TABLES.teachers + ' -> ' + SHEETS.leaveAbsence);
  var values = leaveSheet.getDataRange().getValues();
  var today = todayDateOnly_();
  var substituteKey = codeKey_(substituteReduit);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowSubstituteKey = codeKey_(row[headerMap[HEADERS.leaveSubstituteCode]]);

    if (rowSubstituteKey !== substituteKey) {
      continue;
    }

    var start = asDateOnly_(row[headerMap[HEADERS.leaveStartDate]]);
    var end = asDateOnly_(row[headerMap[HEADERS.leaveEndDate]]);

    if (!start) {
      continue;
    }

    if (start <= today && (!end || end >= today)) {
      return {
        teacherCode: String(row[headerMap[HEADERS.leaveTeacherCode]] || '').trim(),
        substituteCode: String(row[headerMap[HEADERS.leaveSubstituteCode]] || '').trim(),
        startDate: row[headerMap[HEADERS.leaveStartDate]],
        endDate: row[headerMap[HEADERS.leaveEndDate]]
      };
    }
  }

  return null;
}

