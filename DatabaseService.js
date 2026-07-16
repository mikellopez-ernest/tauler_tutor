function getDatabaseSpreadsheetId_() {
  return getRequiredScriptProperty_(SCRIPT_PROPERTIES.databaseId);
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
    throw configurationError_('Missing logical table in registry: ' + tableName);
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
    throw configurationError_('Missing sheet "' + sheetName + '" in ' + context + '.');
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
    throw configurationError_('Missing required header(s) in ' + context + ': ' + missing.join(', '));
  }

  return headerMap;
}

