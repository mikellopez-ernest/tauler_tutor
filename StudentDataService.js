function enrichStudentsWithLocalBirthdates_(students, studentDataSheetName) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.students, studentDataSheetName);
  var birthdateById = loadBirthdateByDinantiaId_(sheet);

  return students.map(function(student) {
    var birthdateInfo = birthdateById[codeKey_(student.id)] || { display: '', iso: '' };
    return {
      id: student.id,
      name: student.name,
      parents: student.parents || [],
      birthdate: birthdateInfo.display,
      birthdateSortKey: birthdateInfo.iso,
      age: calculateAge_(birthdateInfo.iso)
    };
  });
}

function loadBirthdateByDinantiaId_(sheet) {
  var headerMap = requireHeaders_(sheet, [
    HEADERS.studentId,
    HEADERS.studentBirthdate
  ], TABLES.students + ' -> ' + sheet.getName());
  var values = sheet.getDataRange().getValues();
  var birthdateById = {};

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = codeKey_(row[headerMap[HEADERS.studentId]]);

    if (!id) {
      continue;
    }

    birthdateById[id] = normalizeBirthdate_(row[headerMap[HEADERS.studentBirthdate]]);
  }

  return birthdateById;
}

function normalizeBirthdate_(value) {
  if (!value) {
    return { display: '', iso: '' };
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      display: Utilities.formatDate(value, APP_CONFIG.timezone, 'dd/MM/yyyy'),
      iso: Utilities.formatDate(value, APP_CONFIG.timezone, 'yyyy-MM-dd')
    };
  }

  var text = String(value).trim();
  var parsed = parseBirthdateText_(text);

  return {
    display: text,
    iso: parsed ? Utilities.formatDate(parsed, APP_CONFIG.timezone, 'yyyy-MM-dd') : ''
  };
}

function parseBirthdateText_(value) {
  var text = String(value || '').trim();
  var match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

  if (match) {
    var day = Number(match[1]);
    var month = Number(match[2]) - 1;
    var year = Number(match[3]);
    var date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  var isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (isoMatch) {
    var isoYear = Number(isoMatch[1]);
    var isoMonth = Number(isoMatch[2]) - 1;
    var isoDay = Number(isoMatch[3]);
    var isoDate = new Date(isoYear, isoMonth, isoDay);
    if (isoDate.getFullYear() === isoYear && isoDate.getMonth() === isoMonth && isoDate.getDate() === isoDay) {
      return isoDate;
    }
  }

  return null;
}

function calculateAge_(isoBirthdate) {
  if (!isoBirthdate) {
    return '';
  }

  var parts = isoBirthdate.split('-');
  if (parts.length !== 3) {
    return '';
  }

  var birthYear = Number(parts[0]);
  var birthMonth = Number(parts[1]) - 1;
  var birthDay = Number(parts[2]);
  var today = todayDateOnly_();
  var age = today.getFullYear() - birthYear;
  var birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);

  if (today < birthdayThisYear) {
    age--;
  }

  return age >= 0 ? String(age) : '';
}
