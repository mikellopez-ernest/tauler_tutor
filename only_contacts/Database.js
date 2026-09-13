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
  var group = findDinantiaGroupById_(groupId);
  var groupAliases = groupAliases_(group || { id: groupId, name: groupId });
  var cached = loadStudentsForGroupFromCache_(groupAliases);
  if (cached.length) return enrichStudentsWithCachedEmails_(cached);
  return enrichStudentsWithCachedEmails_(loadStudentsForGroupFromRuntimeCache_(group || { id: groupId, name: groupId }));
}

function findDinantiaGroupById_(groupId) {
  groupId = String(groupId || '').trim();
  if (!groupId) return null;
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.dinantiaGroups);
  var headers = requireHeaders_(sheet, [
    'id', 'name', 'path_names'
  ], TABLES.dinantia + ' -> ' + SHEETS.dinantiaGroups);
  if (sheet.getLastRow() < 2) return null;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[headers.id] || '').trim() !== groupId) continue;
    return {
      id: groupId,
      name: String(row[headers.name] || groupId).trim() || groupId,
      pathNames: String(row[headers.path_names] || '').trim()
    };
  }
  return null;
}

function loadStudentsForGroupFromCache_(groupAliases) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'student_email', 'group_name'
  ], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  var acceptedGroups = aliasLookup_(groupAliases);
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!acceptedGroups[textKey_(row[headers.group_name])]) continue;
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

function enrichStudentsWithCachedEmails_(students) {
  var lookup = loadStudentEmailLookupFromCache_();
  return sortStudents_((students || []).map(function(student) {
    student = Object.assign({}, student || {});
    if (!student.email) {
      student.email = lookup.byId[String(student.id || '').trim()] || lookup.byName[textKey_(student.name)] || '';
    }
    return student;
  }));
}

function loadStudentEmailLookupFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'student_email'
  ], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
  var lookup = { byId: {}, byName: {} };
  if (sheet.getLastRow() < 2) return lookup;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var id = String(values[i][headers.student_id] || '').trim();
    var name = String(values[i][headers.student_name] || '').trim();
    var email = String(values[i][headers.student_email] || '').trim().toLowerCase();
    if (!email) continue;
    if (id && !lookup.byId[id]) lookup.byId[id] = email;
    if (name && !lookup.byName[textKey_(name)]) lookup.byName[textKey_(name)] = email;
  }
  return lookup;
}

function fetchStudentsForGroupFromDinantia_(group) {
  var credentials = getDinantiaCredentials_();
  var aliases = groupAliases_(group);
  var students = [];
  var firstPage = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=1', credentials);
  var pageCount = Math.max(1, Number(firstPage.pagination && firstPage.pagination.page_count) || 1);
  var pages = [firstPage].concat(fetchDinantiaAccountPages_(credentials, 2, pageCount));

  pages.forEach(function(body) {
    collectStudentsFromAccountsPage_(students, body, group, aliases);
  });

  return sortStudents_(students);
}

function loadStudentsForGroupFromRuntimeCache_(group) {
  var key = runtimeStudentGroupCacheKey_(group);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Invalid runtime student group cache ignored: ' + (error && error.message ? error.message : error));
    }
  }

  var start = Date.now();
  var students = fetchStudentsForGroupFromDinantia_(group);
  console.log(JSON.stringify({
    event: 'dinantia_group_students_loaded',
    groupId: group.id || '',
    groupName: group.name || '',
    students: students.length,
    elapsedMs: Date.now() - start
  }));
  try {
    cache.put(key, JSON.stringify(students), 21600);
  } catch (error) {
    console.warn('Runtime student group cache write failed: ' + (error && error.message ? error.message : error));
  }
  return students;
}

function runtimeStudentGroupCacheKey_(group) {
  var raw = [APP_CONFIG.runtimeStudentGroupCacheVersion || 'v1'].concat(groupAliases_(group)).join('|');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return 'ro_students_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function fetchDinantiaAccountPages_(credentials, startPage, endPage) {
  if (endPage < startPage) return [];
  var auth = Utilities.base64Encode(credentials.user + ':' + credentials.secret);
  var requests = [];
  for (var page = startPage; page <= endPage; page++) {
    requests.push({
      url: APP_CONFIG.dinantiaBaseUrl + '/v1.2/accounts/index?limit=100&page=' + page,
      method: 'get',
      headers: {
        Authorization: 'Basic ' + auth,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      },
      muteHttpExceptions: true
    });
  }
  return UrlFetchApp.fetchAll(requests).map(parseDinantiaResponse_);
}

function collectStudentsFromAccountsPage_(students, body, group, aliases) {
  (body.data || []).forEach(function(account) {
    if (!accountHasRole_(account, 'Student') || !accountBelongsToGroup_(account, aliases)) return;
    students.push({
      id: account.id || '',
      name: account.name || '',
      groupName: group.name || group.id || '',
      email: account.email || '',
      source: 'dinantia'
    });
  });
}

function accountHasRole_(account, role) {
  role = String(role || '').trim().toLowerCase();
  return (account && account.roles || []).map(function(value) {
    return String(value || '').trim().toLowerCase();
  }).indexOf(role) !== -1;
}

function accountBelongsToGroup_(account, groupAliases) {
  var wanted = aliasLookup_(groupAliases);
  var refs = collectAccountGroupRefs_(account && account.groups);
  for (var i = 0; i < refs.length; i++) {
    if (wanted[textKey_(refs[i])]) return true;
  }
  return false;
}

function groupAliases_(group) {
  group = group || {};
  var aliases = [group.id, group.name, group.pathNames];
  var path = String(group.pathNames || '').trim();
  if (path) {
    path.split(/[>:|/]+/).forEach(function(part) {
      aliases.push(part);
    });
  }
  return uniqueTextValues_(aliases);
}

function aliasLookup_(values) {
  var lookup = {};
  uniqueTextValues_(values).forEach(function(value) {
    lookup[textKey_(value)] = true;
  });
  return lookup;
}

function uniqueTextValues_(values) {
  var seen = {};
  var out = [];
  (Array.isArray(values) ? values : [values]).forEach(function(value) {
    value = String(value || '').trim();
    if (!value || seen[value]) return;
    seen[value] = true;
    out.push(value);
  });
  return out;
}

function collectAccountGroupRefs_(groups) {
  var refs = [];
  if (!groups) return refs;
  Object.keys(groups).forEach(function(scope) {
    flattenGroupRefs_(groups[scope]).forEach(function(ref) {
      if (ref && refs.indexOf(ref) === -1) refs.push(ref);
    });
  });
  return refs;
}

function flattenGroupRefs_(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.reduce(function(out, item) {
      return out.concat(flattenGroupRefs_(item));
    }, []);
  }
  if (typeof value === 'object') {
    return ['id', 'name', 'tag'].map(function(key) {
      return String(value[key] || '').trim();
    }).filter(Boolean);
  }
  var text = String(value || '').trim();
  return text ? [text] : [];
}

function diagnoseReadOnlyGroupStudents_(groupText, studentText) {
  groupText = String(groupText || '').trim();
  studentText = String(studentText || '').trim();
  var report = {
    ok: false,
    query: groupText,
    studentQuery: studentText,
    matchingGroups: [],
    selectedGroup: null,
    cacheCount: 0,
    cacheSample: [],
    dinantiaCount: 0,
    dinantiaSample: [],
    matchingGroupNonStudentCount: 0,
    matchingGroupNonStudentSample: [],
    studentMatches: [],
    studentGroupScopeHits: {},
    studentGroupRefSamples: [],
    pagesScanned: 0,
    studentAccountsScanned: 0,
    error: ''
  };

  try {
    var groups = findDinantiaGroupsByText_(groupText);
    report.matchingGroups = groups;
    report.selectedGroup = groups[0] || findDinantiaGroupById_(groupText) || { id: groupText, name: groupText };

    var cached = loadStudentsForGroupFromCache_(groupAliases_(report.selectedGroup));
    report.cacheCount = cached.length;
    report.cacheSample = cached.slice(0, 10);

    var credentials = getDinantiaCredentials_();
    var page = 1;
    while (true) {
      var body = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=' + page, credentials);
      report.pagesScanned++;
      (body.data || []).forEach(function(account) {
        var hits = matchingAccountGroupScopes_(account, groupAliases_(report.selectedGroup));
        var isStudent = accountHasRole_(account, 'Student');
        if (isStudent) report.studentAccountsScanned++;
        if (studentText && accountMatchesText_(account, studentText)) {
          report.studentMatches.push({
            id: account.id || '',
            name: account.name || '',
            email: account.email || '',
            roles: account.roles || [],
            matchingScopes: hits,
            refs: collectAccountGroupRefs_(account.groups).slice(0, 30)
          });
        }
        if (hits.length && !isStudent) {
          report.matchingGroupNonStudentCount++;
          if (report.matchingGroupNonStudentSample.length < 10) {
            report.matchingGroupNonStudentSample.push({
              id: account.id || '',
              name: account.name || '',
              email: account.email || '',
              roles: account.roles || [],
              scopes: hits
            });
          }
          return;
        }
        if (!isStudent) return;
        if (hits.length) {
          report.dinantiaCount++;
          hits.forEach(function(scope) {
            report.studentGroupScopeHits[scope] = (report.studentGroupScopeHits[scope] || 0) + 1;
          });
          if (report.dinantiaSample.length < 10) {
            report.dinantiaSample.push({
              id: account.id || '',
              name: account.name || '',
              email: account.email || '',
              scopes: hits
            });
          }
        } else if (report.studentGroupRefSamples.length < 10) {
          report.studentGroupRefSamples.push({
            id: account.id || '',
            name: account.name || '',
            refs: collectAccountGroupRefs_(account.groups).slice(0, 20)
          });
        }
      });
      if (!body.pagination || !body.pagination.has_next_page) break;
      page++;
    }

    report.ok = true;
  } catch (error) {
    report.error = error && error.message ? error.message : String(error);
  }

  return report;
}

function accountMatchesText_(account, text) {
  var wanted = textKey_(text);
  if (!wanted) return false;
  return textKey_(account && account.name).indexOf(wanted) !== -1 ||
    wanted.indexOf(textKey_(account && account.name)) !== -1 ||
    textKey_(account && account.email).indexOf(wanted) !== -1 ||
    textKey_(account && account.id) === wanted;
}

function findDinantiaGroupsByText_(groupText) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.dinantiaGroups);
  var headers = requireHeaders_(sheet, [
    'id', 'name', 'parent_id', 'level', 'path_names'
  ], TABLES.dinantia + ' -> ' + SHEETS.dinantiaGroups);
  if (sheet.getLastRow() < 2) return [];
  var wanted = textKey_(groupText);
  var values = sheet.getDataRange().getValues();
  var exactRows = [];
  var containsRows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[headers.id] || '').trim();
    var name = String(row[headers.name] || '').trim();
    var pathNames = String(row[headers.path_names] || '').trim();
    if (!id) continue;
    var idKey = textKey_(id);
    var nameKey = textKey_(name);
    var pathKey = textKey_(pathNames);
    var matched = idKey === wanted || nameKey === wanted || pathKey === wanted;
    var contains = !matched && wanted && (idKey.indexOf(wanted) !== -1 || nameKey.indexOf(wanted) !== -1 || pathKey.indexOf(wanted) !== -1 || wanted.indexOf(idKey) !== -1 || wanted.indexOf(nameKey) !== -1);
    if (!matched && !contains) continue;
    var item = {
      id: id,
      name: name || id,
      parentId: String(row[headers.parent_id] || '').trim(),
      level: Number(row[headers.level]) || 0,
      pathNames: pathNames,
      matchType: matched ? 'exact' : 'contains'
    };
    if (matched) exactRows.push(item);
    else containsRows.push(item);
  }
  return exactRows.concat(containsRows).slice(0, 25);
}

function matchingAccountGroupScopes_(account, groupAliases) {
  var wanted = aliasLookup_(groupAliases);
  var hits = [];
  var groups = account && account.groups;
  if (!groups) return hits;
  Object.keys(groups).forEach(function(scope) {
    var refs = flattenGroupRefs_(groups[scope]);
    for (var i = 0; i < refs.length; i++) {
      if (wanted[textKey_(refs[i])]) {
        hits.push(scope);
        return;
      }
    }
  });
  return hits;
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
  return parseDinantiaResponse_(response);
}

function parseDinantiaResponse_(response) {
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
    return String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ca', { sensitivity: 'base' }) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
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

function textKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
}
