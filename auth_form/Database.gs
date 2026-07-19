function saveAuthorizationResponse_(payload) {
  var registry = loadRegistry_();
  var spreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations));
  var authSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizations);
  var peopleSheet = openSheet_(spreadsheet, FORM_CONFIG.sheetAuthorizedPeople);
  var authHeaders = getHeaderMap_(authSheet);
  var peopleHeaders = getHeaderMap_(peopleSheet);
  requireHeaders_(authHeaders, ['resposta_id', 'data_hora_enviament'], FORM_CONFIG.sheetAuthorizations);
  requireHeaders_(peopleHeaders, ['id', 'resposta_id', 'nom_sencer', 'qualitat_de'], FORM_CONFIG.sheetAuthorizedPeople);

  var respostaId = 'RSP-' + Utilities.getUuid();
  var now = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var normalized = normalizeAuthorizationPayload_(payload);
  normalized.resposta_id = respostaId;
  normalized.data_hora_enviament = now;
  normalized.data_signatura = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, 'yyyy-MM-dd');
  if (!normalized.estat_validacio) normalized.estat_validacio = '';
  if (!normalized.observacions_internes) normalized.observacions_internes = '';

  appendObjectRow_(authSheet, authHeaders, normalized);

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

  return { ok: true, resposta_id: respostaId, persones_autoritzades: people.length };
}

function normalizeAuthorizationPayload_(payload) {
  var out = {};
  var textFields = [
    'idioma_formulari','codi_document','tipus_alumne','curs_inici','curs_fi','centre_nom','centre_codi','municipi','centre_email',
    'alumne_nom','alumne_document','id_student','responent_nom_sencer','responent_telefon','responsable_nom','responsable_document',
    'plataformes_externes','acad_contacte_nom','acad_contacte_email','acad_contacte_relacio','emergencia_nom','emergencia_telefon',
    'emergencia_relacio','problemes_salut','altres_salut','medicacio','posologia','dosi','lloc','data_signatura'
  ];
  textFields.forEach(function(field) {
    out[field] = String(payload[field] === null || payload[field] === undefined ? '' : payload[field]).trim();
  });
  var boolFields = [
    'sortida_sola','sortida_esbarjo','comunicacio_academica','sortides_municipi','imatge_intranet','imatge_web','imatge_externa',
    'publicacio_inicials','obra_oberta','obra_centre','obra_biblioteca','obra_repositori','declaracio_plataformes','comunicacio_salut',
    'administracio_medicacio','paracetamol','signatura_responsable','signatura_alumne'
  ];
  boolFields.forEach(function(field) {
    out[field] = normalizeBooleanForSheet_(payload[field]);
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

function refreshAuthorizationsCache_() {
  var registry = loadRegistry_();
  var dinantiaSpreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableDinantia));
  var cacheSheet = openSheet_(dinantiaSpreadsheet, FORM_CONFIG.sheetAuthorizationsCache);
  var cacheHeaders = getHeaderMap_(cacheSheet);
  var rows = buildAuthorizationsCacheRows_(registry);
  overwriteByHeaders_(cacheSheet, cacheHeaders, rows);
}

function buildAuthorizationsCacheRows_(registry) {
  var authSpreadsheet = SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations));
  var authSheet = openSheet_(authSpreadsheet, FORM_CONFIG.sheetAuthorizations);
  var tokensSheet = openSheet_(authSpreadsheet, FORM_CONFIG.sheetVerificationTokens);
  var authHeaders = getHeaderMap_(authSheet);
  var tokenHeaders = getHeaderMap_(tokensSheet);
  var authorizations = objectsFromSheet_(authSheet, authHeaders);
  var tokens = objectsFromSheet_(tokensSheet, tokenHeaders);
  var latestAuth = {};
  var latestToken = {};

  authorizations.forEach(function(auth) {
    var id = stringValue_(auth.id_student);
    if (!id) return;
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

function stringValue_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}
