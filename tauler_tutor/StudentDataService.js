function enrichStudentsWithLocalBirthdates_(students, studentDataSheetName) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.students, studentDataSheetName);
  var localDataById = loadLocalStudentDataByDinantiaId_(sheet, studentDataSheetName);

  return students.map(function(student) {
    var localInfo = localDataById[codeKey_(student.id)] || { birthdate: { display: '', iso: '' }, document: '', studyType: inferStudyType_(studentDataSheetName), isAdult: '', is14Plus: '' };
    var age = calculateAge_(localInfo.birthdate.iso);
    return {
      id: student.id,
      name: student.name,
      parents: student.parents || [],
      birthdate: localInfo.birthdate.display,
      birthdateSortKey: localInfo.birthdate.iso,
      age: age,
      document: localInfo.document || '',
      studyType: localInfo.studyType || inferStudyType_(studentDataSheetName),
      isAdult: age !== '' ? (Number(age) >= 18 ? 'si' : 'no') : '',
      is14Plus: age !== '' ? (Number(age) >= 14 ? 'si' : 'no') : ''
    };
  });
}

function loadLocalStudentDataByDinantiaId_(sheet, contextName) {
  var headerMap = requireHeaders_(sheet, [
    HEADERS.studentId,
    HEADERS.studentBirthdate
  ], TABLES.students + ' -> ' + sheet.getName());
  var values = sheet.getDataRange().getValues();
  var dataById = {};
  var optionalDocumentHeaders = ['DNI/NIE/Passaport', 'DNI', 'Document', 'document', 'alumne_document'];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = codeKey_(row[headerMap[HEADERS.studentId]]);

    if (!id) {
      continue;
    }

    var documentValue = '';
    optionalDocumentHeaders.some(function(header) {
      if (headerMap[header] !== undefined) {
        documentValue = String(row[headerMap[header]] || '').trim();
        return true;
      }
      return false;
    });
    dataById[id] = {
      birthdate: normalizeBirthdate_(row[headerMap[HEADERS.studentBirthdate]]),
      document: documentValue,
      studyType: inferStudyType_(contextName)
    };
  }

  return dataById;
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


function inferStudyType_(value) {
  var text = codeKey_(value);
  if (text.indexOf('BAT') !== -1) return 'batx';
  if (text.indexOf('FP') !== -1 || text.indexOf('CF') !== -1 || text.indexOf('CICLE') !== -1 || text.indexOf('PFI') !== -1) return 'fp';
  return 'eso';
}
