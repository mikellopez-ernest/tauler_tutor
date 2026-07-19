function rebuildTutorPanelCache() {
  return rebuildTutorPanelCache_();
}

function rebuildTutorPanelCache_() {
  var startedAt = new Date();
  var run = {
    startedAt: startedAt,
    finishedAt: null,
    status: 'running',
    studentsCount: 0,
    contactsCount: 0,
    authorizationsCount: 0,
    message: ''
  };

  try {
    logInfo_('cache_rebuild_started', {});
    var registry = loadTableRegistry_();
    var groupMappings = loadCacheGroupMappings_(registry);
    var accounts = fetchAllDinantiaAccounts_();
    var students = buildStudentsCacheRows_(accounts, groupMappings);
    var contacts = buildContactsCacheRows_(accounts, students);
    var authorizations = buildAuthorizationsCacheRows_();

    overwriteCacheSheet_(registry, TABLES.dinantia, SHEETS.studentsCache, students);
    overwriteCacheSheet_(registry, TABLES.dinantia, SHEETS.contactsCache, contacts);
    overwriteCacheSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache, authorizations);

    run.status = 'ok';
    run.studentsCount = students.length;
    run.contactsCount = contacts.length;
    run.authorizationsCount = authorizations.length;
    run.message = 'Cache rebuilt successfully.';
    logInfo_('cache_rebuild_finished', {
      students: run.studentsCount,
      contacts: run.contactsCount,
      authorizations: run.authorizationsCount
    });
  } catch (error) {
    run.status = 'error';
    run.message = error && error.message ? error.message : String(error);
    logError_('cache_rebuild_failed', error, {});
    throw error;
  } finally {
    run.finishedAt = new Date();
    try {
      appendCacheRun_(run);
    } catch (logError) {
      logError_('cache_run_append_failed', logError, {});
    }
  }

  return {
    ok: run.status === 'ok',
    status: run.status,
    students: run.studentsCount,
    contacts: run.contactsCount,
    authorizations: run.authorizationsCount,
    message: run.message
  };
}

function loadStudentsFromCacheForGroups_(groups) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.studentsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'student_email', 'group_name', 'student_data_sheet',
    'parent_ids', 'birthdate', 'birthdate_sort_key', 'age', 'document', 'study_type',
    'is_adult', 'is_14_plus'
  ], TABLES.dinantia + ' -> ' + SHEETS.studentsCache);
  var groupSet = groupSet_(groups);
  var values = sheet.getDataRange().getValues();
  var students = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var groupName = String(row[headers.group_name] || '').trim();
    if (!groupSet[textKey_(groupName)]) continue;
    students.push({
      id: String(row[headers.student_id] || '').trim(),
      name: String(row[headers.student_name] || '').trim(),
      email: String(row[headers.student_email] || '').trim().toLowerCase(),
      groupName: groupName,
      studentDataSheetName: String(row[headers.student_data_sheet] || '').trim(),
      parents: parseJsonArray_(row[headers.parent_ids]),
      birthdate: String(row[headers.birthdate] || '').trim(),
      birthdateSortKey: String(row[headers.birthdate_sort_key] || '').trim(),
      age: String(row[headers.age] || '').trim(),
      document: String(row[headers.document] || '').trim(),
      studyType: String(row[headers.study_type] || '').trim(),
      isAdult: String(row[headers.is_adult] || '').trim(),
      is14Plus: String(row[headers.is_14_plus] || '').trim()
    });
  }

  return students.filter(function(student) { return student.id; });
}

function loadContactsFromCacheForStudents_(students) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
  var headers = requireHeaders_(sheet, [
    'student_id', 'student_name', 'group_name', 'contact_id', 'contact_position',
    'contact_name', 'contact_email', 'contact_phone'
  ], TABLES.dinantia + ' -> ' + SHEETS.contactsCache);
  if (sheet.getLastRow() < 2) return [];
  var studentSet = {};
  (students || []).forEach(function(student) {
    if (student && student.id) studentSet[String(student.id)] = true;
  });
  var values = sheet.getDataRange().getValues();
  var byStudent = {};

  (students || []).forEach(function(student) {
    if (!student || !student.id) return;
    byStudent[String(student.id)] = {
      id: String(student.id),
      name: String(student.name || ''),
      groupName: String(student.groupName || ''),
      contacts: []
    };
  });

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.student_id] || '').trim();
    if (!studentSet[studentId]) continue;
    if (!byStudent[studentId]) {
      byStudent[studentId] = {
        id: studentId,
        name: String(row[headers.student_name] || '').trim(),
        groupName: String(row[headers.group_name] || '').trim(),
        contacts: []
      };
    }
    byStudent[studentId].contacts.push({
      id: String(row[headers.contact_id] || '').trim(),
      position: Number(row[headers.contact_position]) || byStudent[studentId].contacts.length + 1,
      name: String(row[headers.contact_name] || '').trim(),
      email: String(row[headers.contact_email] || '').trim(),
      phone: String(row[headers.contact_phone] || '').trim()
    });
  }

  return Object.keys(byStudent).map(function(studentId) {
    var item = byStudent[studentId];
    item.contacts.sort(function(a, b) { return Number(a.position || 0) - Number(b.position || 0); });
    return item;
  });
}

function loadAuthorizationDataFromCache_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache);
  var required = authorizationCacheRequiredHeaders_();
  var headers = requireHeaders_(sheet, required, TABLES.dinantia + ' -> ' + SHEETS.authorizationsCache);
  if (sheet.getLastRow() < 2) {
    throw new Error('Authorization cache is empty.');
  }
  var values = sheet.getDataRange().getValues();
  var authorizations = [];
  var invitations = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.id_student] || '').trim();
    if (!studentId) continue;

    if (String(row[headers.resposta_id] || '').trim()) {
      authorizations.push(rowToCacheAuthorization_(row, headers));
    }
    if (String(row[headers.latest_invitation_created_at] || '').trim()) {
      invitations.push({
        created_at: String(row[headers.latest_invitation_created_at] || '').trim(),
        expires_at: String(row[headers.latest_invitation_expires_at] || '').trim(),
        used_at: String(row[headers.latest_invitation_used_at] || '').trim(),
        sender: String(row[headers.latest_invitation_sender] || '').trim(),
        email: String(row[headers.latest_invitation_email] || '').trim(),
        student_id: studentId,
        resposta_id: String(row[headers.latest_invitation_resposta_id] || '').trim(),
        status: String(row[headers.latest_invitation_status] || '').trim()
      });
    }
  }

  return {
    ok: true,
    authorizations: authorizations,
    invitations: invitations
  };
}

function authorizationCacheRequiredHeaders_() {
  return [
    'id_student','resposta_id','data_hora_enviament','data_signatura','idioma_formulari','codi_document','tipus_alumne',
    'sortida_sola','sortida_esbarjo','sortides_municipi','comunicacio_academica','comunicacio_salut','declaracio_plataformes',
    'imatge_intranet','imatge_web','imatge_externa','obra_oberta','obra_centre','obra_biblioteca','obra_repositori',
    'administracio_medicacio','paracetamol','problemes_salut','altres_salut','signatura_responsable','signatura_alumne',
    'acad_contacte_nom','acad_contacte_email','acad_contacte_relacio','emergencia_nom','emergencia_telefon','emergencia_relacio',
    'medicacio','posologia','dosi','plataformes_externes','estat_validacio','observacions_internes',
    'id_student', 'latest_invitation_created_at', 'latest_invitation_expires_at',
    'latest_invitation_used_at', 'latest_invitation_sender', 'latest_invitation_email',
    'latest_invitation_resposta_id', 'latest_invitation_status'
  ];
}

function updateContactsCacheAfterSave_(changes) {
  if (!changes || !changes.length) return;
  try {
    var registry = loadTableRegistry_();
    var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
    var headers = requireHeaders_(sheet, [
      'student_id', 'contact_id', 'contact_name', 'contact_email', 'contact_phone'
    ], TABLES.dinantia + ' -> ' + SHEETS.contactsCache);
    var values = sheet.getDataRange().getValues();
    var rowByKey = {};
    for (var i = 1; i < values.length; i++) {
      var key = String(values[i][headers.student_id] || '').trim() + '|' + String(values[i][headers.contact_id] || '').trim();
      rowByKey[key] = i + 1;
    }

    changes.forEach(function(change) {
      var rowNumber = rowByKey[change.studentId + '|' + change.contactId];
      if (!rowNumber) return;
      var header = change.accountField === 'name' ? 'contact_name' : change.accountField === 'email' ? 'contact_email' : 'contact_phone';
      sheet.getRange(rowNumber, headers[header] + 1).setValue(change.newValue);
    });
  } catch (error) {
    logError_('contacts_cache_update_failed', error, { changes: changes.length });
  }
}

function refreshAuthorizationsCache_() {
  try {
    var registry = loadTableRegistry_();
    var authorizations = buildAuthorizationsCacheRows_();
    overwriteCacheSheet_(registry, TABLES.dinantia, SHEETS.authorizationsCache, authorizations);
    logInfo_('authorizations_cache_refreshed', { rows: authorizations.length });
    return authorizations.length;
  } catch (error) {
    logError_('authorizations_cache_refresh_failed', error, {});
    return 0;
  }
}

function buildStudentsCacheRows_(accounts, groupMappings) {
  var students = [];
  var studentAccounts = (accounts || []).filter(function(account) {
    return (account.roles || []).indexOf('Student') !== -1;
  });

  groupMappings.forEach(function(group) {
    var groupStudents = studentAccounts.filter(function(account) {
      var memberGroups = account.groups && account.groups.member ? account.groups.member : [];
      return memberGroups.indexOf(group.dinantiaGroupId) !== -1;
    }).map(studentFromAccount_);
    students = students.concat(enrichStudentsWithLocalBirthdates_(groupStudents, group.studentDataSheetName, group.dinantiaGroupId));
  });

  students.sort(function(a, b) {
    var groupCompare = String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ca', { sensitivity: 'base' });
    if (groupCompare !== 0) return groupCompare;
    return String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
  });

  return students.map(function(student) {
    return {
      student_id: student.id,
      student_name: student.name,
      student_email: student.email,
      group_name: student.groupName,
      student_data_sheet: student.studentDataSheetName,
      parent_ids: JSON.stringify(student.parents || []),
      birthdate: student.birthdate,
      birthdate_sort_key: student.birthdateSortKey,
      age: student.age,
      document: student.document,
      study_type: student.studyType,
      is_adult: student.isAdult,
      is_14_plus: student.is14Plus
    };
  });
}

function buildContactsCacheRows_(accounts, students) {
  var accountById = {};
  (accounts || []).forEach(function(account) {
    if (account && account.id) accountById[String(account.id)] = account;
  });

  var rows = [];
  (students || []).forEach(function(student) {
    parseJsonArray_(student.parent_ids).forEach(function(parentId, index) {
      var contact = contactFromAccount_(accountById[String(parentId)] || null, parentId);
      rows.push({
        student_id: student.student_id,
        student_name: student.student_name,
        group_name: student.group_name,
        contact_id: contact.id,
        contact_position: index + 1,
        contact_name: contact.name,
        contact_email: contact.email,
        contact_phone: contact.phone
      });
    });
  });
  return rows;
}

function buildAuthorizationsCacheRows_() {
  var authorizations = readAuthorizationRows_();
  var invitations = readVerificationTokenSummaries_();
  var latestAuth = {};
  var latestInvitation = {};

  authorizations.forEach(function(auth) {
    var id = String(auth.id_student || '').trim();
    if (!id) return;
    if (!latestAuth[id] || String(auth.data_hora_enviament || '') >= String(latestAuth[id].data_hora_enviament || '')) latestAuth[id] = auth;
  });
  invitations.forEach(function(invitation) {
    var id = String(invitation.student_id || '').trim();
    if (!id) return;
    if (!latestInvitation[id] || String(invitation.created_at || '') >= String(latestInvitation[id].created_at || '')) latestInvitation[id] = invitation;
  });

  var ids = {};
  Object.keys(latestAuth).forEach(function(id) { ids[id] = true; });
  Object.keys(latestInvitation).forEach(function(id) { ids[id] = true; });

  return Object.keys(ids).map(function(studentId) {
    var row = {};
    var auth = latestAuth[studentId] || {};
    Object.keys(auth).forEach(function(key) { row[key] = auth[key]; });
    row.id_student = studentId;
    var invitation = latestInvitation[studentId] || {};
    row.latest_invitation_created_at = invitation.created_at || '';
    row.latest_invitation_expires_at = invitation.expires_at || '';
    row.latest_invitation_used_at = invitation.used_at || '';
    row.latest_invitation_sender = invitation.sender || '';
    row.latest_invitation_email = invitation.email || '';
    row.latest_invitation_resposta_id = invitation.resposta_id || '';
    row.latest_invitation_status = invitation.status || '';
    return row;
  });
}

function loadCacheGroupMappings_(registry) {
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.groupStudentSheets);
  var headers = requireHeaders_(sheet, [
    HEADERS.classGroupDinantiaId,
    HEADERS.classGroupStudentDataSheet
  ], TABLES.dinantia + ' -> ' + SHEETS.groupStudentSheets);
  var values = sheet.getDataRange().getValues();
  var groups = [];
  for (var i = 1; i < values.length; i++) {
    var groupName = String(values[i][headers[HEADERS.classGroupDinantiaId]] || '').trim();
    var sheetName = String(values[i][headers[HEADERS.classGroupStudentDataSheet]] || '').trim();
    if (groupName && sheetName) {
      groups.push({
        dinantiaGroupId: groupName,
        studentDataSheetName: sheetName
      });
    }
  }
  return groups;
}

function overwriteCacheSheet_(registry, tableName, sheetName, rows) {
  var sheet = openTableSheet_(registry, tableName, sheetName);
  var headers = getHeaderMap_(sheet);
  var headerNames = Object.keys(headers);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  if (!rows || !rows.length) return;
  var width = sheet.getLastColumn();
  var values = rows.map(function(rowObject) {
    var row = new Array(width).fill('');
    headerNames.forEach(function(header) {
      row[headers[header]] = rowObject[header] === undefined ? '' : rowObject[header];
    });
    return row;
  });
  sheet.getRange(2, 1, values.length, width).setValues(values);
}

function appendCacheRun_(run) {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.cacheRuns);
  var headers = requireHeaders_(sheet, [
    HEADERS.cacheRunId,
    HEADERS.cacheRunStartedAt,
    HEADERS.cacheRunFinishedAt,
    HEADERS.cacheRunStatus,
    HEADERS.cacheRunStudents,
    HEADERS.cacheRunContacts,
    HEADERS.cacheRunAuthorizations,
    HEADERS.cacheRunMessage
  ], TABLES.dinantia + ' -> ' + SHEETS.cacheRuns);
  var width = sheet.getLastColumn();
  var row = new Array(width).fill('');
  row[headers[HEADERS.cacheRunId]] = nextNumericId_(sheet, headers[HEADERS.cacheRunId]);
  row[headers[HEADERS.cacheRunStartedAt]] = formatCacheDateTime_(run.startedAt);
  row[headers[HEADERS.cacheRunFinishedAt]] = formatCacheDateTime_(run.finishedAt);
  row[headers[HEADERS.cacheRunStatus]] = run.status;
  row[headers[HEADERS.cacheRunStudents]] = run.studentsCount;
  row[headers[HEADERS.cacheRunContacts]] = run.contactsCount;
  row[headers[HEADERS.cacheRunAuthorizations]] = run.authorizationsCount;
  row[headers[HEADERS.cacheRunMessage]] = run.message;
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, width).setValues([row]);
}

function nextNumericId_(sheet, zeroBasedColumnIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var values = sheet.getRange(2, zeroBasedColumnIndex + 1, lastRow - 1, 1).getValues();
  return values.reduce(function(max, row) {
    var value = Number(row[0]);
    return isNaN(value) ? max : Math.max(max, value);
  }, 0) + 1;
}

function rowToCacheAuthorization_(row, headers) {
  var out = {};
  Object.keys(headers).forEach(function(header) {
    if (header.indexOf('latest_invitation_') === 0) return;
    var value = row[headers[header]];
    out[header] = value instanceof Date ? Utilities.formatDate(value, APP_CONFIG.timezone, 'yyyy-MM-dd') : value;
  });
  return out;
}

function groupSet_(groups) {
  var set = {};
  (groups || []).forEach(function(group) {
    if (group && group.dinantiaGroupId) set[textKey_(group.dinantiaGroupId)] = true;
  });
  return set;
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  var text = String(value || '').trim();
  if (!text) return [];
  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(function(item) { return String(item || '').trim(); }).filter(Boolean) : [];
  } catch (error) {
    return text.split(',').map(function(item) { return String(item || '').trim(); }).filter(Boolean);
  }
}

function formatCacheDateTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(value || '').trim();
}
