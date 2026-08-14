function getDatabaseSpreadsheetId_() {
  return getRequiredScriptProperty_(SCRIPT_PROPERTIES.databaseId);
}

function getRequiredScriptProperty_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  value = String(value || '').trim();
  if (!value) {
    throw new Error('Missing required script property: ' + name);
  }
  return value;
}

function loadTableRegistry_() {
  var spreadsheet = SpreadsheetApp.openById(getDatabaseSpreadsheetId_());
  var sheet = openSheetByName_(spreadsheet, SHEETS.registry, 'database registry');
  var values = sheet.getDataRange().getValues();
  var registry = {};

  values.forEach(function(row) {
    var tableName = String(row[0] || '').trim();
    var spreadsheetId = String(row[1] || '').trim();
    if (tableName && spreadsheetId) {
      registry[tableName] = spreadsheetId;
    }
  });

  return registry;
}

function openTableSpreadsheet_(registry, tableName) {
  var spreadsheetId = registry[tableName];
  if (!spreadsheetId) {
    throw new Error('Missing logical table in registry: ' + tableName);
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function openTableSheet_(registry, tableName, sheetName) {
  var spreadsheet = openTableSpreadsheet_(registry, tableName);
  return openSheetByName_(spreadsheet, sheetName, 'logical table "' + tableName + '"');
}

function openSheetByName_(spreadsheet, sheetName, context) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing sheet "' + sheetName + '" in ' + context + '.');
  }
  return sheet;
}

function getHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};

  headers.forEach(function(header, index) {
    var key = String(header || '').trim();
    if (key) {
      map[key] = index;
    }
  });

  return map;
}

function requireHeaders_(sheet, requiredHeaders, context) {
  var headerMap = getHeaderMap_(sheet);
  var missing = requiredHeaders.filter(function(header) {
    return headerMap[header] === undefined;
  });

  if (missing.length) {
    throw new Error('Missing required header(s) in ' + context + ': ' + missing.join(', '));
  }

  return headerMap;
}

function loadContactsFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'group_name', 'contact_id', 'contact_position',
    'contact_name', 'contact_email', 'contact_phone'
  ], TABLES.dinantia + ' -> ' + SHEETS.contactsCache);

  if (sheet.getLastRow() < 2) return [];

  var values = sheet.getDataRange().getValues();
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.student_id] || '').trim();
    var studentName = String(row[headers.student_name] || '').trim();
    var groupName = String(row[headers.group_name] || '').trim();
    var contactId = String(row[headers.contact_id] || '').trim();

    if (!studentId && !studentName && !contactId) continue;

    rows.push({
      studentId: studentId,
      groupName: groupName,
      studentName: studentName,
      contactId: contactId,
      contactPosition: Number(row[headers.contact_position]) || 0,
      contactName: String(row[headers.contact_name] || '').trim(),
      contactEmail: String(row[headers.contact_email] || '').trim(),
      contactPhone: String(row[headers.contact_phone] || '').trim()
    });
  }

  rows.sort(function(a, b) {
    return String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ca', { sensitivity: 'base' }) ||
      String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ca', { sensitivity: 'base' }) ||
      Number(a.contactPosition || 0) - Number(b.contactPosition || 0) ||
      String(a.contactName || '').localeCompare(String(b.contactName || ''), 'ca', { sensitivity: 'base' });
  });

  return rows;
}
