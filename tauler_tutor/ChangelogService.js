function appendChangelogRows_(changes, userEmail) {
  if (!changes || !changes.length) {
    return;
  }

  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.changelog);
  var headerMap = requireHeaders_(sheet, [
    HEADERS.changelogId,
    HEADERS.changelogDatetime,
    HEADERS.changelogUserMail,
    HEADERS.changelogFieldChanged,
    HEADERS.changelogOldValue,
    HEADERS.changelogNewValue,
    HEADERS.changelogStudentId
  ], TABLES.dinantia + ' -> ' + SHEETS.changelog);
  var nextId = getNextChangelogId_(sheet, headerMap);
  var now = Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
  var width = sheet.getLastColumn();
  var rows = changes.map(function(change, index) {
    var row = new Array(width).fill('');
    row[headerMap[HEADERS.changelogId]] = nextId + index;
    row[headerMap[HEADERS.changelogDatetime]] = now;
    row[headerMap[HEADERS.changelogUserMail]] = userEmail;
    row[headerMap[HEADERS.changelogFieldChanged]] = change.fieldChanged;
    row[headerMap[HEADERS.changelogOldValue]] = change.oldValue;
    row[headerMap[HEADERS.changelogNewValue]] = change.newValue;
    row[headerMap[HEADERS.changelogStudentId]] = change.studentId;
    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, width).setValues(rows);
}

function getNextChangelogId_(sheet, headerMap) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 1;
  }

  var idValues = sheet.getRange(2, headerMap[HEADERS.changelogId] + 1, lastRow - 1, 1).getValues();
  var maxId = idValues.reduce(function(max, row) {
    var value = Number(row[0]);
    return isNaN(value) ? max : Math.max(max, value);
  }, 0);

  return maxId + 1;
}
