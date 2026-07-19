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
      authorizations: readAuthorizationRows_(),
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
    'administracio_medicacio','paracetamol','problemes_salut','altres_salut','signatura_responsable','signatura_alumne'
  ];
  var headers = requireHeaders_(sheet, required, TABLES.authorizations + ' -> ' + SHEETS.authorizations);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var studentId = String(row[headers.id_student] || '').trim();
    if (!studentId) continue;
    rows.push(rowToAuthorization_(row, headers));
  }
  return rows;
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
