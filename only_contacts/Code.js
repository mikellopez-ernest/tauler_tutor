function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Alumnes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function loadReadOnlyInitialJson() {
  try {
    return JSON.stringify({
      ok: true,
      groups: loadReadOnlyGroupOptions_(),
      students: loadAllStudentsFromCache_()
    });
  } catch (error) {
    logPublicError_('tauler_professors_read_only_initial_load_failed', error);
    return JSON.stringify({ ok: false, error: publicReadOnlyError_(error, 'No s han pogut carregar els grups.') });
  }
}

function loadStudentsForGroupJson(groupId) {
  try {
    return JSON.stringify({
      ok: true,
      students: loadStudentsForGroup_(groupId)
    });
  } catch (error) {
    logPublicError_('tauler_professors_read_only_students_load_failed', error);
    return JSON.stringify({ ok: false, error: publicReadOnlyError_(error, 'No s han pogut carregar els alumnes.') });
  }
}

function loadContactsJson() {
  try {
    return JSON.stringify({
      ok: true,
      contacts: loadContactsFromCache_()
    });
  } catch (error) {
    logPublicError_('tauler_professors_read_only_contacts_load_failed', error);
    return JSON.stringify({
      ok: false,
      error: publicReadOnlyError_(error, "No s'han pogut carregar els contactes.")
    });
  }
}

function loadAuthorizationsReadOnlyJson() {
  try {
    return JSON.stringify(loadAuthorizationsReadOnly_());
  } catch (error) {
    logPublicError_('tauler_professors_read_only_authorizations_load_failed', error);
    return JSON.stringify({
      ok: false,
      error: publicReadOnlyError_(error, "No s'han pogut carregar les autoritzacions.")
    });
  }
}

function createReadOnlyXlsx(payload) {
  var fileName = sanitizeXlsxFileName_(payload && payload.fileName ? payload.fileName : 'export.xlsx');
  var sheetName = sanitizeSheetName_(payload && payload.sheetName ? payload.sheetName : 'Dades');
  var rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    throw new Error('No hi ha dades visibles per exportar.');
  }

  var alwaysHeaders = payload && Array.isArray(payload.alwaysHeaders) ? payload.alwaysHeaders : [];
  var requestedColumns = payload && Array.isArray(payload.columns) ? payload.columns : [];
  var columns = collectExportColumns_(rows, alwaysHeaders, requestedColumns);
  if (!columns.length) {
    throw new Error('No hi ha columnes visibles per exportar.');
  }

  var tempSpreadsheet = SpreadsheetApp.create(fileName.replace(/\.xlsx$/i, ''));
  var tempFile = DriveApp.getFileById(tempSpreadsheet.getId());

  try {
    var sheet = tempSpreadsheet.getSheets()[0];
    sheet.setName(sheetName);
    writeReadOnlyXlsxSheet_(sheet, columns, rows);
    SpreadsheetApp.flush();

    var exportUrl = 'https://www.googleapis.com/drive/v3/files/' + tempSpreadsheet.getId() + '/export' +
      '?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var response = UrlFetchApp.fetch(exportUrl, {
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      throw new Error("No s'ha pogut exportar el fitxer XLSX (" + response.getResponseCode() + ').');
    }

    return {
      fileName: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Utilities.base64Encode(response.getBlob().getBytes()),
      message: 'Fitxer XLSX generat.'
    };
  } finally {
    tempFile.setTrashed(true);
  }
}

function logPublicError_(event, error) {
  console.error(JSON.stringify({
    event: event,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : ''
  }));
}

function publicReadOnlyError_(error, fallbackMessage) {
  var message = error && error.message ? String(error.message) : String(error || '');

  if (/Missing required script property/i.test(message)) {
    if (message.indexOf(SCRIPT_PROPERTIES.databaseId) !== -1) {
      return {
        code: 'DATABASE_CONFIG_MISSING',
        title: APP_CONFIG.genericErrorTitle,
        message: 'La configuració de la base de dades no està completa. Contacta amb el centre.'
      };
    }
    if (message.indexOf(SCRIPT_PROPERTIES.dinantiaUser) !== -1 || message.indexOf(SCRIPT_PROPERTIES.dinantiaSecret) !== -1) {
      return {
        code: 'DINANTIA_CONFIG_MISSING',
        title: APP_CONFIG.genericErrorTitle,
        message: 'La configuració de Dinantia no està completa. Contacta amb el centre.'
      };
    }
    return {
      code: 'CONFIG_MISSING',
      title: APP_CONFIG.genericErrorTitle,
      message: 'La configuració del servei no està completa. Contacta amb el centre.'
    };
  }

  if (/Missing logical table|Missing sheet|Missing required header/i.test(message)) {
    return {
      code: 'CACHE_CONFIG',
      title: APP_CONFIG.genericErrorTitle,
      message: 'La cache de contactes no esta configurada correctament. Contacta amb el centre.'
    };
  }

  if (/permission|permis|authorization|authorization is required|access denied|not have access/i.test(message)) {
    return {
      code: 'PERMISSION_REQUIRED',
      title: APP_CONFIG.genericErrorTitle,
      message: "Cal autoritzar el servei abans de carregar els contactes. Contacta amb el centre."
    };
  }

  return {
    code: 'LOAD_FAILED',
    title: APP_CONFIG.genericErrorTitle,
    message: fallbackMessage || "No s'han pogut carregar les dades."
  };
}

function diagnoseTaulerProfessorsReadOnlySetup() {
  var report = {
    ok: false,
    dbPropertyPresent: false,
    dinantiaCredentialsPresent: false,
    registryReadable: false,
    dinantiaRegistered: false,
    dinantiaGroupsReadable: false,
    studentsCacheReadable: false,
    contactsCacheReadable: false,
    authorizationsCacheReadable: false,
    requiredHeadersPresent: false,
    rowCount: 0,
    error: ''
  };

  try {
    report.dbPropertyPresent = !!String(PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTIES.databaseId) || '').trim();
    report.dinantiaCredentialsPresent = !!String(PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTIES.dinantiaUser) || '').trim() &&
      !!String(PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTIES.dinantiaSecret) || '').trim();
    var registry = loadTableRegistry_();
    report.registryReadable = true;
    report.dinantiaRegistered = !!registry[TABLES.dinantia];
    var groupsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.dinantiaGroups);
    requireHeaders_(groupsSheet, ['id', 'name', 'parent_id', 'level', 'path_names', 'sort_order', 'active'], TABLES.dinantia + ' -> ' + SHEETS.dinantiaGroups);
    report.dinantiaGroupsReadable = true;
    var studentsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
    requireHeaders_(studentsSheet, ['student_id', 'student_name', 'group_name'], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
    report.studentsCacheReadable = true;
    var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
    report.contactsCacheReadable = true;
    requireHeaders_(sheet, [
      'student_id', 'student_name', 'group_name', 'contact_id', 'contact_position',
      'contact_name', 'contact_email', 'contact_phone', 'contact_source'
    ], TABLES.dinantia + ' -> ' + SHEETS.contactsCache);
    var authorizationsSheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache);
    requireHeaders_(authorizationsSheet, ['id_student'], TABLES.dinantia + ' -> ' + SHEETS.authorizationsCache);
    report.authorizationsCacheReadable = true;
    report.requiredHeadersPresent = true;
    report.rowCount = Math.max(0, sheet.getLastRow() - 1);
    report.ok = true;
  } catch (error) {
    report.error = error && error.message ? error.message : String(error);
  }

  return report;
}

function diagnoseOnlyContactsSetup() {
  return diagnoseTaulerProfessorsReadOnlySetup();
}

function diagnoseTaulerProfessorsReadOnlyGroupStudents(groupText) {
  var report = diagnoseReadOnlyGroupStudents_(groupText || 'OPT3.1-Francès');
  logDiagnosticReport_(report);
  return report;
}

function diagnoseOpt31FrancesStudents() {
  var report = diagnoseReadOnlyGroupStudents_('OPT3.1-Francès');
  logDiagnosticReport_(report);
  return report;
}

function diagnoseOpt31ArtCreativitatStudents() {
  var report = diagnoseReadOnlyGroupStudents_('OPT3.1- Art i creativitat 1', 'Venón Jaraba, Julián');
  logDiagnosticReport_(report);
  return report;
}

function logDiagnosticReport_(report) {
  var text = JSON.stringify(report, null, 2);
  console.log(text);
  Logger.log(text);
}

function authorizeTaulerProfessorsReadOnlyServices() {
  var result = diagnoseTaulerProfessorsReadOnlySetup();
  if (result.ok !== true) {
    throw new Error('Tauler professors read-only authorization/setup check failed: ' + (result.error || 'Unknown error'));
  }
  authorizeTaulerProfessorsReadOnlyExportServices();
  return result;
}

function authorizeOnlyContactsServices() {
  return authorizeTaulerProfessorsReadOnlyServices();
}

function authorizeTaulerProfessorsReadOnlyExportServices() {
  var tempSpreadsheet = SpreadsheetApp.create('tauler_professors_read_only_export_permission_probe_' + Date.now());
  var tempFile = DriveApp.getFileById(tempSpreadsheet.getId());

  try {
    var sheet = tempSpreadsheet.getSheets()[0];
    sheet.getRange(1, 1, 2, 2).setValues([
      ['Permis', 'Estat'],
      ['XLSX', 'OK']
    ]);
    SpreadsheetApp.flush();

    var exportUrl = 'https://www.googleapis.com/drive/v3/files/' + tempSpreadsheet.getId() + '/export' +
      '?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var response = UrlFetchApp.fetch(exportUrl, {
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      throw new Error("No s'ha pogut validar l'exportacio XLSX (" + response.getResponseCode() + ').');
    }

    return {
      ok: true,
      message: 'Permisos XLSX validats correctament.'
    };
  } finally {
    tempFile.setTrashed(true);
  }
}

function collectExportColumns_(rows, alwaysHeaders, requestedColumns) {
  var seen = {};
  var always = {};
  var columns = [];

  (alwaysHeaders || []).forEach(function(header) {
    header = String(header || '').trim();
    if (!header || seen[header]) return;
    always[header] = true;
  });

  (requestedColumns || []).forEach(function(column) {
    var normalized = normalizeExportColumn_(column);
    if (!normalized.key || seen[normalized.key]) return;
    seen[normalized.key] = true;
    if (always[normalized.key] || rows.some(function(row) { return hasExportValue_(row && row[normalized.key]); })) {
      columns.push(normalized);
    }
  });

  if (!requestedColumns || !requestedColumns.length) {
    (alwaysHeaders || []).forEach(function(header) {
      header = String(header || '').trim();
      if (!header || seen[header]) return;
      seen[header] = true;
      columns.push({ key: header, label: header, group: '' });
    });
  }

  rows.forEach(function(row) {
    Object.keys(row || {}).forEach(function(header) {
      if (seen[header]) return;
      if (!hasExportValue_(row[header])) return;
      seen[header] = true;
      columns.push({ key: header, label: header, group: requestedColumns && requestedColumns.length ? 'Altres dades' : '' });
    });
  });

  return columns;
}

function normalizeExportColumn_(column) {
  if (typeof column === 'string') {
    return { key: String(column || '').trim(), label: String(column || '').trim(), group: '' };
  }
  column = column || {};
  var key = String(column.key || '').trim();
  return {
    key: key,
    label: String(column.label || key).trim(),
    group: String(column.group || '').trim()
  };
}

function hasExportValue_(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== '';
}

function writeReadOnlyXlsxSheet_(sheet, columns, rows) {
  var hasGroupedHeaders = columns.some(function(column) { return column.group; });
  var values = [];

  if (hasGroupedHeaders) {
    values.push(columns.map(function(column) { return column.group || ''; }));
  }
  values.push(columns.map(function(column) { return column.label || column.key; }));
  rows.forEach(function(row) {
    values.push(columns.map(function(column) {
      return sanitizeSpreadsheetExportValue_(row[column.key]);
    }));
  });

  sheet.getRange(1, 1, values.length, columns.length).setValues(values);
  if (hasGroupedHeaders) mergeExportHeaderGroups_(sheet, columns);
  sheet.setFrozenRows(hasGroupedHeaders ? 2 : 1);
  sheet.getRange(1, 1, hasGroupedHeaders ? 2 : 1, columns.length)
    .setFontWeight('bold')
    .setBackground('#e7f3f1')
    .setFontColor('#102027')
    .setHorizontalAlignment('center')
    .setWrap(true);
  sheet.getDataRange()
    .setFontFamily('Arial')
    .setFontSize(10)
    .setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, columns.length);
  for (var column = 1; column <= columns.length; column++) {
    var width = sheet.getColumnWidth(column);
    sheet.setColumnWidth(column, Math.max(90, Math.min(width + 18, 360)));
  }
}

function mergeExportHeaderGroups_(sheet, columns) {
  var start = 1;
  var group = columns.length ? columns[0].group : '';
  for (var index = 1; index <= columns.length; index++) {
    var nextGroup = index < columns.length ? columns[index].group : null;
    if (nextGroup === group) continue;
    var width = index - start + 1;
    if (group && width > 1) {
      sheet.getRange(1, start, 1, width).merge();
    }
    start = index + 1;
    group = nextGroup;
  }
}

function sanitizeSpreadsheetExportValue_(value) {
  var text = String(value === null || value === undefined ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function sanitizeXlsxFileName_(fileName) {
  fileName = String(fileName || 'export.xlsx').replace(/[\\/:*?"<>|]/g, '_').trim();
  if (!fileName) fileName = 'export.xlsx';
  if (!/\.xlsx$/i.test(fileName)) fileName += '.xlsx';
  return fileName;
}

function sanitizeSheetName_(sheetName) {
  sheetName = String(sheetName || 'Dades').replace(/[\[\]*?:/\\]/g, ' ').trim();
  if (!sheetName) sheetName = 'Dades';
  return sheetName.slice(0, 99);
}
