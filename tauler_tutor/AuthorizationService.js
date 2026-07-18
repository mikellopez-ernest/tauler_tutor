function loadAuthorizationData_() {
  try {
    return {
      ok: true,
      authorizations: readAuthorizationRows_()
    };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return {
      ok: false,
      error: errorToViewModel_(error),
      authorizations: []
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
