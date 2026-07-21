function loadAuthorizationData_() {
  try {
    return loadAuthorizationDataCached_();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return {
      ok: false,
      error: errorToViewModel_(error),
      authorizations: [],
      invitations: []
    };
  }
}

function loadAuthorizationDataCached_() {
  try {
    var cached = loadAuthorizationDataFromCache_();
    logInfo_('authorizations_loaded_from_cache', {
      authorizations: cached.authorizations.length,
      invitations: cached.invitations.length
    });
    return cached;
  } catch (error) {
    logError_('authorizations_cache_load_failed_live_fallback', error, {});
    return {
      ok: true,
      authorizations: attachAuthorizedPeopleToAuthorizations_(readAuthorizationRows_()),
      invitations: readVerificationTokenSummaries_()
    };
  }
}

function readAuthorizationRows_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.authorizations, SHEETS.authorizations);
  var required = [
    'id_student','resposta_id','data_hora_enviament','data_signatura','idioma_formulari','codi_document','tipus_alumne',
    'sortida_sola','sortida_esbarjo','sortides_municipi','comunicacio_academica','comunicacio_salut','declaracio_plataformes',
    'imatge_intranet','imatge_web','imatge_externa','publicacio_inicials','obra_oberta','obra_centre','obra_biblioteca','obra_repositori',
    'administracio_medicacio','paracetamol','carta_compromis_acceptada','consentiment_mobil','problemes_salut','altres_salut','signatura_responsable','signatura_alumne',
    'invalidated','invalidated_at','invalidated_by_email','invalidated_reason'
  ];
  var headers = requireHeaders_(sheet, required, TABLES.authorizations + ' -> ' + SHEETS.authorizations);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.id_student] || '').trim();
    if (!studentId) continue;
    var auth = rowToAuthorization_(row, headers);
    if (parseAuthorizationBoolean_(auth.invalidated) === true) continue;
    rows.push(auth);
  }
  return rows;
}

function attachAuthorizedPeopleToAuthorizations_(authorizations) {
  var peopleByResponse = readAuthorizedPeopleByResponse_();
  return (authorizations || []).map(function(auth) {
    auth.authorized_people = peopleByResponse[String(auth.resposta_id || '').trim()] || [];
    auth.authorized_people_json = JSON.stringify(auth.authorized_people);
    return auth;
  });
}

function readAuthorizedPeopleByResponse_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.authorizations, SHEETS.authorizedPeople);
  var headers = requireHeaders_(sheet, ['resposta_id', 'nom_sencer', 'qualitat_de'], TABLES.authorizations + ' -> ' + SHEETS.authorizedPeople);
  var values = sheet.getDataRange().getValues();
  var byResponse = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var responseId = String(row[headers.resposta_id] || '').trim();
    if (!responseId) continue;
    var person = {
      nom_sencer: String(row[headers.nom_sencer] || '').trim(),
      qualitat_de: String(row[headers.qualitat_de] || '').trim()
    };
    if (!person.nom_sencer && !person.qualitat_de) continue;
    if (!byResponse[responseId]) byResponse[responseId] = [];
    byResponse[responseId].push(person);
  }
  return byResponse;
}

function rowToAuthorization_(row, h) {
  var out = {};
  Object.keys(h).forEach(function(header) {
    var value = row[h[header]];
    out[header] = value instanceof Date ? Utilities.formatDate(value, APP_CONFIG.timezone, 'yyyy-MM-dd') : value;
  });
  return out;
}

function readVerificationTokenSummaries_() {
  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.authorizations, SHEETS.verificationTokens);
  var required = ['created_at','expires_at','used_at','sender','email','student_id','resposta_id','status'];
  var headers = requireHeaders_(sheet, required, TABLES.authorizations + ' -> ' + SHEETS.verificationTokens);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.student_id] || '').trim();
    if (!studentId) continue;
    rows.push(rowToVerificationTokenSummary_(row, headers));
  }
  return rows;
}

function rowToVerificationTokenSummary_(row, h) {
  return {
    created_at: formatSheetDateTime_(row[h.created_at]),
    expires_at: formatSheetDateTime_(row[h.expires_at]),
    used_at: formatSheetDateTime_(row[h.used_at]),
    sender: String(row[h.sender] || '').trim(),
    email: String(row[h.email] || '').trim(),
    student_id: String(row[h.student_id] || '').trim(),
    resposta_id: String(row[h.resposta_id] || '').trim(),
    status: String(row[h.status] || '').trim()
  };
}

function formatSheetDateTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(value || '').trim();
}

function invalidateAuthorizationResponse_(request) {
  request = request || {};
  var respostaId = String(request.resposta_id || '').trim();
  var reason = String(request.reason || '').trim();
  if (!respostaId) throw new AppError('No es pot invalidar el formulari: falta el codi de resposta.', { code: 'AUTH_INVALIDATE_MISSING_RESPONSE' });

  var registry = loadTableRegistry_();
  var sheet = openTableSheet_(registry, TABLES.authorizations, SHEETS.authorizations);
  var headers = requireHeaders_(sheet, [
    'resposta_id', 'invalidated', 'invalidated_at', 'invalidated_by_email', 'invalidated_reason'
  ], TABLES.authorizations + ' -> ' + SHEETS.authorizations);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][headers.resposta_id] || '').trim() !== respostaId) continue;
    var rowNumber = i + 1;
    sheet.getRange(rowNumber, headers.invalidated + 1).setValue(true);
    sheet.getRange(rowNumber, headers.invalidated_at + 1).setValue(formatSheetDateTime_(new Date()));
    sheet.getRange(rowNumber, headers.invalidated_by_email + 1).setValue(getCurrentUserEmail_());
    sheet.getRange(rowNumber, headers.invalidated_reason + 1).setValue(reason);
    refreshAuthorizationsCache_();
    return { ok: true, resposta_id: respostaId };
  }
  throw new AppError('No es pot invalidar el formulari: no s ha trobat la resposta.', { code: 'AUTH_INVALIDATE_NOT_FOUND' });
}

function parseAuthorizationBoolean_(value) {
  if (value === true) return true;
  if (value === false) return false;
  var text = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (!text) return null;
  if (['true','si','sí','1','acceptada'].indexOf(text) !== -1) return true;
  if (['false','no','0'].indexOf(text) !== -1) return false;
  return null;
}
