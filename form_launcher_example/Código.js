function doGet() {
  return renderError_('Aquest endpoint espera una peticio POST des del tauler de tutoria.');
}

function doPost(e) {
  var payload = parsePayload_(e);
  var validation = validatePayload_(payload);
  if (validation) {
    return renderError_(validation);
  }
  return renderLauncher_(payload);
}

function renderLauncher_(payload) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.payload = payload;
  template.authFormUrl = LAUNCHER_CONFIG.authFormUrl;
  return template.evaluate()
    .setTitle(LAUNCHER_CONFIG.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderError_(message) {
  var safe = escapeHtml_(message || 'No s ha pogut preparar el formulari.');
  return HtmlService.createHtmlOutput('<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#f6f7f9;margin:0;display:grid;place-items:center;min-height:100vh}.box{max-width:680px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:28px}h1{color:#b42318}</style></head><body><main class="box"><h1>No s ha pogut obrir el formulari</h1><p>' + safe + '</p></main></body></html>')
    .setTitle('Error')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function parsePayload_(e) {
  var payload = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(key) { payload[key] = e.parameter[key]; });
  }
  if (e && e.postData && e.postData.contents && String(e.postData.type || '').indexOf('json') !== -1) {
    var parsed = JSON.parse(e.postData.contents);
    Object.keys(parsed || {}).forEach(function(key) { payload[key] = parsed[key]; });
  }
  payload.student_id = stringValue_(payload.student_id || payload.id_student || payload.id_alumne);
  payload.alumne_nom = stringValue_(payload.alumne_nom || payload.student_name);
  payload.alumne_document = stringValue_(payload.alumne_document || payload.document_alumne);
  payload.studyType = stringValue_(payload.studyType || payload.estudis);
  payload.isAdult = normalizeSiNo_(payload.isAdult || payload.major_edat);
  payload.is14Plus = normalizeSiNo_(payload.is14Plus || payload.major_14);
  payload.contact_name = stringValue_(payload.contact_name);
  payload.contact_phone = stringValue_(payload.contact_phone);
  payload.contact_email = stringValue_(payload.contact_email);
  payload.tutor_email = stringValue_(payload.tutor_email);
  return payload;
}

function validatePayload_(payload) {
  if (!payload.student_id) return 'Falta l identificador de l alumne.';
  if (!payload.alumne_nom) return 'Falta el nom de l alumne.';
  if (['eso', 'batx', 'fp'].indexOf(payload.studyType) === -1) return 'Falta o no es valida l etapa educativa.';
  if (['si', 'no'].indexOf(payload.isAdult) === -1) return 'Falta o no es valid el camp de majoria d edat.';
  return '';
}

function normalizeSiNo_(value) {
  var text = String(value || '').trim().toLowerCase();
  if (['si', 'sí', 'true', '1', 'yes'].indexOf(text) !== -1) return 'si';
  if (['no', 'false', '0'].indexOf(text) !== -1) return 'no';
  return '';
}

function stringValue_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
