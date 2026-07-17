function textKey_(value) {
  return String(value === null || value === undefined ? '' : value).trim().replace(/\s+/g, ' ');
}

function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function isTrue_(value) {
  return value === true || String(value).trim().toUpperCase() === 'TRUE';
}

function fullNameFromTeacherRow_(row, headerMap) {
  return [
    row[headerMap[HEADERS.teacherFirstName]],
    row[headerMap[HEADERS.teacherSurname1]],
    row[headerMap[HEADERS.teacherSurname2]]
  ].map(function(value) {
    return String(value || '').trim();
  }).filter(Boolean).join(' ');
}

function todayDateOnly_() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function asDateOnly_(value) {
  if (!value) {
    return null;
  }

  var date = value instanceof Date ? new Date(value) : new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

