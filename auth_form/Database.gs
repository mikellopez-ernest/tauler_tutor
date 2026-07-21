function saveAuthorizationResponse_(payload) {
  var tokenRecord = validateLauncherTokenForSave_(payload || {});
  updateVerifiedRespondentContact_(payload || {}, tokenRecord);
  var registry = loadRegistry_();
  var spreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations));
  var authSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizations);
  var peopleSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizedPeople);
  var authHeaders = getHeaderMap_(authSheet);
  var peopleHeaders = getHeaderMap_(peopleSheet);
  requireHeaders_(authHeaders, ['resposta_id', 'data_hora_enviament'], FORM_CONFIG.sheetAuthorizations);
  requireHeaders_(peopleHeaders, ['id', 'resposta_id', 'nom_sencer', 'qualitat_de'], FORM_CONFIG.sheetAuthorizedPeople);

  var now = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var normalized = normalizeAuthorizationPayload_(payload);
  var mode = String(payload.form_mode || payload.mode || '').trim();
  var existingResponseId = String(payload.resposta_id || '').trim();
  var updateExisting = mode === 'edit_owner' && existingResponseId;
  var respostaId = updateExisting ? existingResponseId : 'RSP-' + Utilities.getUuid();
  var existingRow = updateExisting ? findRowByHeaderValue_(authSheet, authHeaders, 'resposta_id', existingResponseId) : null;
  if (updateExisting && !existingRow) throw new Error('Authorization response not found for update: ' + existingResponseId);

  normalized.resposta_id = respostaId;
  if (!updateExisting) normalized.data_hora_enviament = now;
  normalized.data_signatura = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, 'yyyy-MM-dd');
  if (!normalized.estat_validacio) normalized.estat_validacio = '';
  if (!normalized.observacions_internes) normalized.observacions_internes = '';
  normalized.updated_at = now;
  normalized.updated_by_email = normalizeEmail_((tokenRecord && tokenRecord.email) || payload.verified_email || payload.updated_by_email || payload.submitted_by_email);
  if (mode === 'new_student_adult') {
    normalized.signatura_alumne = true;
    normalized.student_confirmed_at = now;
    normalized.student_confirmed_email = normalizeEmail_((tokenRecord && tokenRecord.email) || payload.verified_email);
  }
  if (!updateExisting) {
    normalized.submitted_by_dinantia_account_id = String((tokenRecord && tokenRecord.dinantia_account_id) || payload.verified_dinantia_account_id || '').trim();
    normalized.submitted_by_email = normalizeEmail_((tokenRecord && tokenRecord.email) || payload.verified_email || payload.submitted_by_email);
    normalized.invalidated = false;
  }

  if (updateExisting) {
    var existing = objectFromRow_(authSheet.getRange(existingRow, 1, 1, authSheet.getLastColumn()).getValues()[0], authHeaders);
    normalized.data_hora_enviament = existing.data_hora_enviament || now;
    normalized.submitted_by_dinantia_account_id = existing.submitted_by_dinantia_account_id || normalized.submitted_by_dinantia_account_id || '';
    normalized.submitted_by_email = existing.submitted_by_email || normalized.submitted_by_email || '';
    normalized.student_confirmed_at = existing.student_confirmed_at || '';
    normalized.student_confirmed_email = existing.student_confirmed_email || '';
    if (normalizeBooleanForSheet_(existing.signatura_alumne) === true) normalized.signatura_alumne = true;
    if (normalizeBooleanForSheet_(existing.signatura_responsable) === true) normalized.signatura_responsable = true;
    updateObjectRow_(authSheet, authHeaders, existingRow, normalized);
    deleteAuthorizedPeopleForResponse_(peopleSheet, peopleHeaders, respostaId);
  } else {
    appendObjectRow_(authSheet, authHeaders, normalized);
  }

  var people = extractAuthorizedPeople_(payload);
  people.forEach(function(person) {
    appendObjectRow_(peopleSheet, peopleHeaders, {
      id: 'PER-' + Utilities.getUuid(),
      resposta_id: respostaId,
      nom_sencer: person.nom_sencer,
      qualitat_de: person.qualitat_de
    });
  });

  refreshAuthorizationsCache_();
  markLauncherTokenUsedForEditableSave_(payload || {}, tokenRecord);

  return { ok: true, resposta_id: respostaId, persones_autoritzades: people.length, updated: updateExisting };
}

function updateVerifiedRespondentContact_(payload, tokenRecord) {
  if (!tokenRecord || tokenRecord.sender !== 'parent' || !tokenRecord.dinantia_account_id) return;
  var fields = {};
  var name = String(payload.responent_nom_sencer || '').trim();
  var phone = String(payload.responent_telefon || '').trim();
  if (name) fields.name = name;
  fields.phone = apiPhoneValueForDinantia_(phone);
  if (!Object.keys(fields).length) return;
  updateDinantiaAccountFields_(tokenRecord.dinantia_account_id, fields);
  updateContactsCacheForRespondent_(tokenRecord.dinantia_account_id, { name: name, phone: phone });
}

function apiPhoneValueForDinantia_(value) {
  var text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return null;
  var compact = text.replace(/[\s().-]/g, '');
  if (compact.indexOf('00') === 0) return '+' + compact.slice(2);
  if (compact.charAt(0) === '+') return compact;
  var digits = compact.replace(/\D/g, '');
  if (/^[6789]\d{8}$/.test(digits)) return '+34' + digits;
  throw new Error('Invalid phone number: ' + text);
}

function updateDinantiaAccountFields_(accountId, fields) {
  var user = getRequiredScriptProperty_('dinantia_api_user');
  var secret = getRequiredScriptProperty_('dinantia_api_secret');
  var response = UrlFetchApp.fetch(FORM_CONFIG.dinantiaBaseUrl + '/v1.2/accounts/update/' + encodeURIComponent(accountId), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(fields),
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(user + ':' + secret),
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
    throw new Error('Dinantia contact update response is not valid JSON. HTTP ' + status + ': ' + text);
  }
  if (status < 200 || status >= 300 || body.success === false) {
    throw new Error('Dinantia contact update failed. HTTP ' + status + ': ' + text);
  }
}

function updateContactsCacheForRespondent_(contactId, fields) {
  var sheet;
  try {
    sheet = openTableSheetFromRegistry_(FORM_CONFIG.tableDinantia, 'contacts_cache');
  } catch (error) {
    return;
  }
  var h = getHeaderMap_(sheet);
  if (h.contact_id === undefined) return;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][h.contact_id] || '').trim() !== String(contactId)) continue;
    if (h.contact_name !== undefined && fields.name !== undefined) sheet.getRange(i + 1, h.contact_name + 1).setValue(fields.name);
    if (h.contact_phone !== undefined && fields.phone !== undefined) sheet.getRange(i + 1, h.contact_phone + 1).setValue(fields.phone);
  }
}

function normalizeAuthorizationPayload_(payload) {
  var out = {};
  var textFields = [
    'idioma_formulari','codi_document','tipus_alumne','curs_inici','curs_fi','centre_nom','centre_codi','municipi','centre_email',
    'alumne_nom','alumne_document','id_student','responent_nom_sencer','responent_telefon','responsable_nom','responsable_document',
    'plataformes_externes','acad_contacte_nom','acad_contacte_email','acad_contacte_relacio','emergencia_nom','emergencia_telefon',
    'emergencia_relacio','problemes_salut','altres_salut','medicacio','posologia','dosi','lloc','data_signatura',
    'submitted_by_dinantia_account_id','submitted_by_email','updated_at','updated_by_email','student_confirmed_at','student_confirmed_email',
    'invalidated_at','invalidated_by_email','invalidated_reason'
  ];
  textFields.forEach(function(field) {
    out[field] = String(payload[field] === null || payload[field] === undefined ? '' : payload[field]).trim();
  });
  var boolFields = [
    'sortida_sola','sortida_esbarjo','comunicacio_academica','sortides_municipi','imatge_intranet','imatge_web','imatge_externa',
    'publicacio_inicials','obra_oberta','obra_centre','obra_biblioteca','obra_repositori','declaracio_plataformes','comunicacio_salut',
    'administracio_medicacio','paracetamol','carta_compromis_acceptada','consentiment_mobil','signatura_responsable','signatura_alumne','invalidated'
  ];
  boolFields.forEach(function(field) {
    out[field] = normalizeBooleanForSheet_(payload[field]);
  });
  return out;
}

function loadAuthorizationResponse_(respostaId) {
  var registry = loadRegistry_();
  var spreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations));
  var authSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizations);
  var peopleSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizedPeople);
  var authHeaders = getHeaderMap_(authSheet);
  var peopleHeaders = getHeaderMap_(peopleSheet);
  var rowNumber = findRowByHeaderValue_(authSheet, authHeaders, 'resposta_id', respostaId);
  if (!rowNumber) throw new Error('Authorization response not found: ' + respostaId);
  var out = objectFromRow_(authSheet.getRange(rowNumber, 1, 1, authSheet.getLastColumn()).getValues()[0], authHeaders);
  var people = findAuthorizedPeopleForResponse_(peopleSheet, peopleHeaders, respostaId);
  people.forEach(function(person, index) {
    out['persona_autoritzada_nom_' + (index + 1)] = person.nom_sencer || '';
    out['persona_autoritzada_qualitat_' + (index + 1)] = person.qualitat_de || '';
  });
  return out;
}

function normalizeBooleanForSheet_(value) {
  if (value === true) return true;
  if (value === false) return false;
  var text = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (!text) return '';
  if (['si', 'sí', 'true', '1', 'acceptada', 'on'].indexOf(text) !== -1) return true;
  if (['no', 'false', '0'].indexOf(text) !== -1) return false;
  return '';
}

function validateLauncherTokenForForm_(prefill) {
  var mode = String(prefill.form_mode || prefill.mode || '').trim();
  if (!mode) return null;
  var token = String(prefill.launcher_token || '').trim();
  if (!token) throw new Error('Missing launcher verification token.');
  var record = validateLauncherToken_(token);
  assertTokenMatchesPayload_(record, prefill);
  return record;
}

function validateLauncherTokenForSave_(payload) {
  var mode = String(payload.form_mode || payload.mode || '').trim();
  if (!mode) throw new Error('The authorization form must be opened through the verified launcher before it can be submitted.');
  if (['new_parent', 'new_student_adult', 'edit_owner'].indexOf(mode) === -1) return null;
  var token = String(payload.launcher_token || '').trim();
  if (!token) throw new Error('Missing launcher verification token.');
  var record = validateLauncherToken_(token);
  assertTokenMatchesPayload_(record, payload);
  if (mode === 'edit_owner' && codeKey_(record.dinantia_account_id) !== codeKey_(payload.verified_dinantia_account_id)) {
    throw new Error('Launcher token does not match the original respondent.');
  }
  return record;
}

function validateLauncherToken_(rawToken) {
  expireOldLauncherTokens_();
  var hash = hashLauncherToken_(rawToken);
  var sheet = openTableSheetFromRegistry_(FORM_CONFIG.tableAuthorizations, FORM_CONFIG.sheetVerificationTokens);
  var h = getHeaderMap_(sheet);
  requireHeaders_(h, ['token_hash', 'status', 'expires_at', 'sender', 'email', 'student_id', 'resposta_id'], FORM_CONFIG.sheetVerificationTokens);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][h.token_hash] || '').trim() !== hash) continue;
    var record = objectFromRow_(values[i], h);
    record._rowNumber = i + 1;
    if (record.status === 'revoked') throw new Error('Launcher token revoked.');
    if (record.status === 'used') throw new Error('Launcher token already used.');
    if (new Date(record.expires_at).getTime() < new Date().getTime()) {
      sheet.getRange(i + 1, h.status + 1).setValue('expired');
      throw new Error('Launcher token expired.');
    }
    return record;
  }
  throw new Error('Launcher token not found.');
}

function assertTokenMatchesPayload_(record, payload) {
  var mode = String(payload.form_mode || payload.mode || '').trim();
  var studentId = String(payload.id_student || payload.student_id || '').trim();
  var respostaId = String(payload.resposta_id || '').trim();
  if (record.student_id && studentId && codeKey_(record.student_id) !== codeKey_(studentId)) {
    throw new Error('Launcher token does not match the student.');
  }
  if (record.resposta_id && respostaId && String(record.resposta_id) !== respostaId) {
    throw new Error('Launcher token does not match the response.');
  }
  if (mode === 'new_parent' && record.sender !== 'parent') throw new Error('Launcher token does not match the parent flow.');
  if (mode === 'new_student_adult' && record.sender !== 'student') throw new Error('Launcher token does not match the student flow.');
  if (mode === 'student_confirm' && record.sender !== 'student') throw new Error('Launcher token does not match the student confirmation flow.');
  if (mode === 'readonly_print' && record.sender !== 'tutor_print') throw new Error('Launcher token does not match the tutor print flow.');
}

function markLauncherTokenUsedForEditableSave_(payload, tokenRecord) {
  var mode = String(payload.form_mode || payload.mode || '').trim();
  if (['new_parent', 'new_student_adult', 'edit_owner'].indexOf(mode) === -1) return;
  var record = tokenRecord || validateLauncherToken_(String(payload.launcher_token || '').trim());
  var sheet = openTableSheetFromRegistry_(FORM_CONFIG.tableAuthorizations, FORM_CONFIG.sheetVerificationTokens);
  var h = getHeaderMap_(sheet);
  sheet.getRange(record._rowNumber, h.used_at + 1).setValue(Utilities.formatDate(new Date(), FORM_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  sheet.getRange(record._rowNumber, h.status + 1).setValue('used');
}

function expireOldLauncherTokens_() {
  var sheet = openTableSheetFromRegistry_(FORM_CONFIG.tableAuthorizations, FORM_CONFIG.sheetVerificationTokens);
  var h = getHeaderMap_(sheet);
  if (h.status === undefined || h.expires_at === undefined) return;
  var values = sheet.getDataRange().getValues();
  var now = new Date().getTime();
  for (var i = 1; i < values.length; i++) {
    var status = String(values[i][h.status] || '').trim();
    var expiresAt = new Date(values[i][h.expires_at]).getTime();
    if (status === 'pending' && expiresAt && expiresAt < now) {
      sheet.getRange(i + 1, h.status + 1).setValue('expired');
    }
  }
}

function openTableSheetFromRegistry_(tableName, sheetName) {
  var registry = loadRegistry_();
  var spreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, tableName));
  return openSheet_(spreadsheet, sheetName);
}

function hashLauncherToken_(rawToken) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(rawToken));
  return Utilities.base64EncodeWebSafe(bytes);
}

function extractAuthorizedPeople_(payload) {
  var indexes = {};
  Object.keys(payload || {}).forEach(function(key) {
    var match = key.match(/^persona_autoritzada_(nom|qualitat)_(\d+)$/);
    if (match) indexes[match[2]] = true;
  });
  return Object.keys(indexes).sort(function(a, b) { return Number(a) - Number(b); }).map(function(index) {
    return {
      nom_sencer: String(payload['persona_autoritzada_nom_' + index] || '').trim(),
      qualitat_de: String(payload['persona_autoritzada_qualitat_' + index] || '').trim()
    };
  }).filter(function(person) {
    return person.nom_sencer || person.qualitat_de;
  });
}

function loadRegistry_() {
  var databaseId = getRequiredScriptProperty_(FORM_CONFIG.databaseProperty);
  var spreadsheet = SpreadsheetApp.openById(databaseId);
  var sheet = openSheet_(spreadsheet, FORM_CONFIG.registrySheet);
  var values = sheet.getDataRange().getValues();
  var registry = {};
  for (var i = 1; i < values.length; i++) {
    var table = String(values[i][0] || '').trim();
    var id = String(values[i][1] || '').trim();
    if (table && id) registry[table] = id;
  }
  return registry;
}

function getRequiredScriptProperty_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || !String(value).trim()) throw new Error('Missing required script property: ' + name);
  return String(value).trim();
}

function requireRegistryEntry_(registry, tableName) {
  if (!registry[tableName]) throw new Error('Missing logical table in registry: ' + tableName);
  return registry[tableName];
}

function openSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  return sheet;
}

function getHeaderMap_(sheet) {
  var values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  values.forEach(function(header, index) {
    var key = String(header || '').trim();
    if (key) map[key] = index;
  });
  return map;
}

function requireHeaders_(headerMap, headers, context) {
  var missing = headers.filter(function(header) { return headerMap[header] === undefined; });
  if (missing.length) throw new Error('Missing required headers in ' + context + ': ' + missing.join(', '));
}

function appendObjectRow_(sheet, headerMap, object) {
  var width = sheet.getLastColumn();
  var row = new Array(width).fill('');
  Object.keys(object).forEach(function(key) {
    if (headerMap[key] !== undefined) row[headerMap[key]] = object[key];
  });
  sheet.appendRow(row);
}

function updateObjectRow_(sheet, headerMap, rowNumber, object) {
  var width = sheet.getLastColumn();
  var current = sheet.getRange(rowNumber, 1, 1, width).getValues()[0];
  Object.keys(object).forEach(function(key) {
    if (headerMap[key] !== undefined) current[headerMap[key]] = object[key];
  });
  sheet.getRange(rowNumber, 1, 1, width).setValues([current]);
}

function findRowByHeaderValue_(sheet, headerMap, header, value) {
  if (headerMap[header] === undefined) throw new Error('Missing required header in ' + sheet.getName() + ': ' + header);
  var target = String(value || '').trim();
  if (!target) return null;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][headerMap[header]] || '').trim() === target) return i + 1;
  }
  return null;
}

function findAuthorizedPeopleForResponse_(sheet, headerMap, respostaId) {
  var values = sheet.getDataRange().getValues();
  var people = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][headerMap.resposta_id] || '').trim() !== respostaId) continue;
    people.push({
      nom_sencer: String(values[i][headerMap.nom_sencer] || '').trim(),
      qualitat_de: String(values[i][headerMap.qualitat_de] || '').trim()
    });
  }
  return people;
}

function deleteAuthorizedPeopleForResponse_(sheet, headerMap, respostaId) {
  for (var row = sheet.getLastRow(); row >= 2; row--) {
    if (String(sheet.getRange(row, headerMap.resposta_id + 1).getValue() || '').trim() === respostaId) {
      sheet.deleteRow(row);
    }
  }
}

function normalizeEmail_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}

function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function refreshAuthorizationsCache_() {
  var registry = loadRegistry_();
  var dinantiaSpreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableDinantia));
  var cacheSheet = openSheet_(dinantiaSpreadsheet, FORM_CONFIG.sheetAuthorizationsCache);
  var rows = buildAuthorizationsCacheRows_(registry);
  var cacheHeaders = ensureHeadersForRows_(cacheSheet, rows);
  overwriteByHeaders_(cacheSheet, cacheHeaders, rows);
}

function buildAuthorizationsCacheRows_(registry) {
  var authSpreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations));
  var authSheet = openSheet_(authSpreadsheet, FORM_CONFIG.sheetAuthorizations);
  var peopleSheet = openSheet_(authSpreadsheet, FORM_CONFIG.sheetAuthorizedPeople);
  var tokensSheet = openSheet_(authSpreadsheet, FORM_CONFIG.sheetVerificationTokens);
  var authHeaders = getHeaderMap_(authSheet);
  var peopleHeaders = getHeaderMap_(peopleSheet);
  var tokenHeaders = getHeaderMap_(tokensSheet);
  var authorizations = objectsFromSheet_(authSheet, authHeaders);
  var peopleByResponse = authorizedPeopleByResponse_(peopleSheet, peopleHeaders);
  var tokens = objectsFromSheet_(tokensSheet, tokenHeaders);
  var latestAuth = {};
  var latestToken = {};

  authorizations.forEach(function(auth) {
    var id = stringValue_(auth.id_student);
    if (!id) return;
    if (normalizeBooleanForSheet_(auth.invalidated) === true) return;
    auth.authorized_people_json = JSON.stringify(peopleByResponse[stringValue_(auth.resposta_id)] || []);
    if (!latestAuth[id] || stringValue_(auth.data_hora_enviament) >= stringValue_(latestAuth[id].data_hora_enviament)) {
      latestAuth[id] = auth;
    }
  });

  tokens.forEach(function(token) {
    var id = stringValue_(token.student_id);
    if (!id) return;
    if (!latestToken[id] || stringValue_(token.created_at) >= stringValue_(latestToken[id].created_at)) {
      latestToken[id] = token;
    }
  });

  var ids = {};
  Object.keys(latestAuth).forEach(function(id) { ids[id] = true; });
  Object.keys(latestToken).forEach(function(id) { ids[id] = true; });

  return Object.keys(ids).map(function(studentId) {
    var out = {};
    var auth = latestAuth[studentId] || {};
    Object.keys(auth).forEach(function(key) { out[key] = auth[key]; });
    var token = latestToken[studentId] || {};
    out.id_student = studentId;
    out.latest_invitation_created_at = token.created_at || '';
    out.latest_invitation_expires_at = token.expires_at || '';
    out.latest_invitation_used_at = token.used_at || '';
    out.latest_invitation_sender = token.sender || '';
    out.latest_invitation_email = token.email || '';
    out.latest_invitation_resposta_id = token.resposta_id || '';
    out.latest_invitation_status = token.status || '';
    return out;
  });
}

function authorizedPeopleByResponse_(sheet, headerMap) {
  var required = ['resposta_id', 'nom_sencer', 'qualitat_de'];
  requireHeaders_(headerMap, required, sheet.getName());
  var values = sheet.getDataRange().getValues();
  var byResponse = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var responseId = stringValue_(row[headerMap.resposta_id]);
    if (!responseId) continue;
    var person = {
      nom_sencer: stringValue_(row[headerMap.nom_sencer]),
      qualitat_de: stringValue_(row[headerMap.qualitat_de])
    };
    if (!person.nom_sencer && !person.qualitat_de) continue;
    if (!byResponse[responseId]) byResponse[responseId] = [];
    byResponse[responseId].push(person);
  }
  return byResponse;
}

function objectsFromSheet_(sheet, headerMap) {
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    rows.push(objectFromRow_(values[i], headerMap));
  }
  return rows;
}

function objectFromRow_(row, headerMap) {
  var out = {};
  Object.keys(headerMap).forEach(function(header) {
    var value = row[headerMap[header]];
    out[header] = value instanceof Date ? Utilities.formatDate(value, FORM_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX") : value;
  });
  return out;
}

function overwriteByHeaders_(sheet, headerMap, objects) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  if (!objects.length) return;
  var width = sheet.getLastColumn();
  var headers = Object.keys(headerMap);
  var values = objects.map(function(object) {
    var row = new Array(width).fill('');
    headers.forEach(function(header) {
      row[headerMap[header]] = object[header] === undefined ? '' : object[header];
    });
    return row;
  });
  sheet.getRange(2, 1, values.length, width).setValues(values);
}

function ensureHeadersForRows_(sheet, rows) {
  var headerMap = getHeaderMap_(sheet);
  var missing = {};
  (rows || []).forEach(function(row) {
    Object.keys(row || {}).forEach(function(key) {
      if (headerMap[key] === undefined) missing[key] = true;
    });
  });
  var missingNames = Object.keys(missing);
  if (!missingNames.length) return headerMap;
  sheet.getRange(1, sheet.getLastColumn() + 1, 1, missingNames.length).setValues([missingNames]);
  return getHeaderMap_(sheet);
}

function stringValue_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}
