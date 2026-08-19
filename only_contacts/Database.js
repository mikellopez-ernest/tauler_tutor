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

function loadReadOnlyGroupOptions_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.dinantiaGroups);
  var headers = requireHeaders_(sheet, [
    'id', 'name', 'parent_id', 'level', 'path_names', 'sort_order', 'active'
  ], TABLES.dinantia + ' -> ' + SHEETS.dinantiaGroups);
  if (sheet.getLastRow() < 2) return [];

  var values = sheet.getDataRange().getValues();
  var byId = {};
  var roots = {};
  APP_CONFIG.rootGroupIds.forEach(function(id) { roots[id] = true; });

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[headers.id] || '').trim();
    if (!id) continue;
    byId[id] = {
      id: id,
      name: String(row[headers.name] || id).trim(),
      parentId: String(row[headers.parent_id] || '').trim(),
      level: Number(row[headers.level]) || 0,
      pathNames: String(row[headers.path_names] || '').trim(),
      sortOrder: Number(row[headers.sort_order]) || i,
      active: parseBooleanValue_(row[headers.active])
    };
  }

  function rootIdFor(group) {
    var cursor = group;
    var guard = {};
    while (cursor && cursor.id && !guard[cursor.id]) {
      if (roots[cursor.id]) return cursor.id;
      guard[cursor.id] = true;
      cursor = cursor.parentId ? byId[cursor.parentId] : null;
    }
    return '';
  }

  var out = [];
  Object.keys(byId).forEach(function(id) {
    var group = byId[id];
    if (group.active === false) return;
    var rootId = rootIdFor(group);
    if (!rootId) return;
    var root = byId[rootId];
    var relativeLevel = Math.max(0, group.level - (root ? root.level : 0));
    out.push({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      level: relativeLevel,
      rootId: rootId,
      rootName: root ? root.name : rootId,
      pathNames: group.pathNames,
      sortOrder: group.sortOrder
    });
  });

  var rootIndex = {};
  APP_CONFIG.rootGroupIds.forEach(function(id, index) { rootIndex[id] = index; });
  out.sort(function(a, b) {
    var rootCompare = (rootIndex[a.rootId] || 0) - (rootIndex[b.rootId] || 0);
    if (rootCompare !== 0) return rootCompare;
    return String(a.pathNames || '').localeCompare(String(b.pathNames || ''), 'ca', { sensitivity: 'base' }) ||
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
  return out;
}

function loadStudentsForGroup_(groupId) {
  groupId = String(groupId || '').trim();
  if (!groupId || groupId === '__none') return [];
  var cached = loadStudentsForGroupFromCache_(groupId);
  if (cached.length) return cached;
  return fetchStudentsForGroupFromDinantia_(groupId);
}

function loadStudentsForGroupFromCache_(groupId) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'student_email', 'group_name'
  ], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[headers.group_name] || '').trim() !== groupId) continue;
    rows.push({
      id: String(row[headers.student_id] || '').trim(),
      name: String(row[headers.student_name] || '').trim(),
      groupName: String(row[headers.group_name] || '').trim(),
      email: String(row[headers.student_email] || '').trim().toLowerCase(),
      source: 'cache'
    });
  }
  return sortStudents_(rows);
}

function fetchStudentsForGroupFromDinantia_(groupId) {
  var credentials = getDinantiaCredentials_();
  var students = [];
  var page = 1;

  while (true) {
    var body = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=' + page, credentials);
    (body.data || []).forEach(function(account) {
      var roles = account.roles || [];
      var memberGroups = account.groups && account.groups.member ? account.groups.member : [];
      if (roles.indexOf('Student') === -1 || memberGroups.indexOf(groupId) === -1) return;
      students.push({
        id: account.id || '',
        name: account.name || '',
        groupName: groupId,
        email: account.email || '',
        source: 'dinantia'
      });
    });
    if (!body.pagination || !body.pagination.has_next_page) break;
    page++;
  }

  return sortStudents_(students);
}

function loadAuthorizationsReadOnly_() {
  return {
    ok: true,
    students: loadAllStudentsFromCache_(),
    authorizations: loadAuthorizationsFromCache_(),
    invitations: loadInvitationSummariesFromCache_()
  };
}

function loadAllStudentsFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'student_email', 'group_name', 'birthdate',
    'age', 'document', 'study_type', 'is_adult', 'is_14_plus'
  ], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[headers.student_id] || '').trim();
    if (!id) continue;
    rows.push({
      id: id,
      name: String(row[headers.student_name] || '').trim(),
      email: String(row[headers.student_email] || '').trim().toLowerCase(),
      groupName: String(row[headers.group_name] || '').trim(),
      birthdate: formatDateValue_(row[headers.birthdate]),
      age: String(row[headers.age] || '').trim(),
      document: String(row[headers.document] || '').trim(),
      studyType: String(row[headers.study_type] || '').trim(),
      isAdult: String(row[headers.is_adult] || '').trim(),
      is14Plus: String(row[headers.is_14_plus] || '').trim()
    });
  }
  return sortStudents_(rows);
}

function loadAuthorizationsFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache);
  var headers = getHeaderMap_(sheet);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var out = {};
    Object.keys(headers).forEach(function(header) {
      if (header.indexOf('latest_invitation_') === 0) return;
      out[header] = formatCellValue_(values[i][headers[header]]);
    });
    if (String(out.id_student || '').trim() && String(out.resposta_id || '').trim()) rows.push(out);
  }
  return rows;
}

function loadInvitationSummariesFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache);
  var headers = getHeaderMap_(sheet);
  if (sheet.getLastRow() < 2 || headers.id_student === undefined || headers.latest_invitation_created_at === undefined) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var studentId = String(values[i][headers.id_student] || '').trim();
    var createdAt = String(values[i][headers.latest_invitation_created_at] || '').trim();
    if (!studentId || !createdAt) continue;
    rows.push({
      student_id: studentId,
      created_at: formatCellValue_(values[i][headers.latest_invitation_created_at]),
      expires_at: headers.latest_invitation_expires_at === undefined ? '' : formatCellValue_(values[i][headers.latest_invitation_expires_at]),
      used_at: headers.latest_invitation_used_at === undefined ? '' : formatCellValue_(values[i][headers.latest_invitation_used_at]),
      sender: headers.latest_invitation_sender === undefined ? '' : String(values[i][headers.latest_invitation_sender] || '').trim(),
      email: headers.latest_invitation_email === undefined ? '' : String(values[i][headers.latest_invitation_email] || '').trim(),
      resposta_id: headers.latest_invitation_resposta_id === undefined ? '' : String(values[i][headers.latest_invitation_resposta_id] || '').trim(),
      status: headers.latest_invitation_status === undefined ? '' : String(values[i][headers.latest_invitation_status] || '').trim()
    });
  }
  return rows;
}

function loadContactsFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'group_name', 'contact_id', 'contact_position',
    'contact_name', 'contact_email', 'contact_phone', 'contact_source'
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
      contactPhone: String(row[headers.contact_phone] || '').trim(),
      contactSource: String(row[headers.contact_source] || 'dinantia').trim() || 'dinantia'
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

function getDinantiaCredentials_() {
  return {
    user: getRequiredScriptProperty_(SCRIPT_PROPERTIES.dinantiaUser),
    secret: getRequiredScriptProperty_(SCRIPT_PROPERTIES.dinantiaSecret)
  };
}

function fetchDinantiaJson_(path, credentials) {
  var auth = Utilities.base64Encode(credentials.user + ':' + credentials.secret);
  var response = UrlFetchApp.fetch(APP_CONFIG.dinantiaBaseUrl + path, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + auth,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error('Dinantia response is not valid JSON. HTTP ' + status + ': ' + text);
  }
  if (status < 200 || status >= 300 || body.success === false) {
    throw new Error('Dinantia request failed. HTTP ' + status + ': ' + text);
  }
  return body;
}

function sortStudents_(students) {
  return (students || []).filter(function(student) {
    return student && student.id;
  }).sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
  });
}

function parseBooleanValue_(value) {
  if (value === true) return true;
  if (value === false) return false;
  var text = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (!text) return null;
  if (['true', 'si', 'sí', '1', 'yes'].indexOf(text) !== -1) return true;
  if (['false', 'no', '0'].indexOf(text) !== -1) return false;
  return null;
}

function formatCellValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(value === null || value === undefined ? '' : value).trim();
}

function formatDateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.timezone, 'dd/MM/yyyy');
  }
  return String(value === null || value === undefined ? '' : value).trim();
}
