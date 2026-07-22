function doGet() {
  try {
    return renderForm_({});
  } catch (error) {
    return renderFormError_(error);
  }
}

function doPost(e) {
  try {
    return renderForm_(parsePrefillFromEvent_(e));
  } catch (error) {
    return renderFormError_(error);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function renderForm_(prefill) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialFormDataJson = JSON.stringify(buildFastInitialFormData_(prefill || {}));
  return template
    .evaluate()
    .setTitle('Autoritzacions, declaracions i comunicacions')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderFormError_(error) {
  var message = String(error && error.message ? error.message : error || '');
  var title = 'No s ha pogut obrir el formulari';
  var body = 'S ha produït un error. Si el problema continua, poseu-vos en contacte amb el centre.';
  if (/already used/i.test(message)) {
    title = 'Enllaç ja utilitzat';
    body = 'Aquest enllaç ja s ha utilitzat. Si necessiteu tornar a accedir al formulari, torneu a iniciar el procés o demaneu un nou enllaç al centre.';
  } else if (/expired/i.test(message)) {
    title = 'Enllaç caducat';
    body = 'Aquest enllaç ha caducat. Torneu a iniciar el procés per rebre un nou enllaç. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.';
  }
  return HtmlService.createHtmlOutput('<!doctype html><html lang="ca"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml_(title) + '</title><style>body{margin:0;background:#f6f7f9;color:#17202a;font-family:Arial,sans-serif;line-height:1.5}main{width:min(760px,calc(100% - 32px));margin:36px auto;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:30px;box-shadow:0 16px 40px rgba(21,34,50,.10)}h1{font-size:28px;line-height:1.2;margin:0 0 18px;color:#b42318}</style></head><body><main><h1>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(body) + '</p></main></body></html>')
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function submitAuthorizationResponse(payload) {
  return saveAuthorizationResponse_(payload || {});
}

function resolveInitialFormData(payload) {
  try {
    return {
      ok: true,
      data: resolveInitialFormData_(normalizePrefillAliases_(payload || {}))
    };
  } catch (error) {
    return {
      ok: false,
      html: renderFormError_(error).getContent()
    };
  }
}

function buildFastInitialFormData_(prefill) {
  var normalized = normalizePrefillAliases_(prefill || {});
  var initial = Object.assign({}, FORM_DEFAULTS);
  var accepted = [
    'studyType', 'isAdult', 'is14Plus', 'alumne_nom', 'alumne_document', 'id_student',
    'responent_nom_sencer', 'responent_telefon', 'responsable_nom',
    'form_mode', 'mode', 'resposta_id', 'verified_actor_type', 'verified_dinantia_account_id',
    'verified_email', 'launcher_token'
  ];
  accepted.forEach(function(key) {
    if (normalized[key] !== undefined && normalized[key] !== null && String(normalized[key]).trim() !== '') {
      initial[key] = normalizePrefillValue_(key, normalized[key]);
    }
  });
  if (!initial.form_mode && initial.mode) initial.form_mode = initial.mode;
  if (!initial.data_signatura) {
    initial.data_signatura = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, 'yyyy-MM-dd');
  }
  initial.launcher_url = FORM_CONFIG.launcherUrl;
  if (initial.form_mode || initial.launcher_token || initial.resposta_id) {
    initial.__async_initial_payload = normalized;
  }
  return initial;
}

function resolveInitialFormData_(prefill) {
  var initial = Object.assign({}, FORM_DEFAULTS);
  var accepted = [
    'studyType', 'isAdult', 'is14Plus', 'alumne_nom', 'alumne_document', 'id_student',
    'responent_nom_sencer', 'responent_telefon', 'responsable_nom',
    'form_mode', 'mode', 'resposta_id', 'verified_actor_type', 'verified_dinantia_account_id',
    'verified_email', 'launcher_token'
  ];
  accepted.forEach(function(key) {
    if (prefill[key] !== undefined && prefill[key] !== null && String(prefill[key]).trim() !== '') {
      initial[key] = normalizePrefillValue_(key, prefill[key]);
    }
  });
  if (!initial.form_mode && initial.mode) initial.form_mode = initial.mode;
  var tokenRecord = validateLauncherTokenForForm_(initial);
  if (tokenRecord) {
    initial.verified_actor_type = tokenRecord.sender === 'student' ? 'student' : 'parent';
    initial.verified_dinantia_account_id = tokenRecord.dinantia_account_id || '';
    initial.verified_email = tokenRecord.email || '';
    if (!initial.id_student && tokenRecord.student_id) initial.id_student = tokenRecord.student_id;
    if (!initial.resposta_id && tokenRecord.resposta_id) initial.resposta_id = tokenRecord.resposta_id;
  }
  if (initial.resposta_id) {
    var existing = loadAuthorizationResponse_(initial.resposta_id);
    Object.keys(existing || {}).forEach(function(key) {
      if (existing[key] !== undefined && existing[key] !== null && String(existing[key]).trim() !== '') {
        initial[key] = existing[key];
      }
    });
    if (initial.mode && !initial.form_mode) initial.form_mode = initial.mode;
    if (prefill.form_mode) initial.form_mode = prefill.form_mode;
    if (prefill.mode) initial.form_mode = prefill.mode;
    ['verified_actor_type', 'verified_dinantia_account_id', 'verified_email', 'launcher_token'].forEach(function(key) {
      if (prefill[key] !== undefined && prefill[key] !== null) initial[key] = normalizePrefillValue_(key, prefill[key]);
    });
  }
  if (!initial.data_signatura) {
    initial.data_signatura = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, 'yyyy-MM-dd');
  }
  initial.launcher_url = FORM_CONFIG.launcherUrl;
  return initial;
}

function parsePrefillFromEvent_(e) {
  var values = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(key) {
      values[key] = e.parameter[key];
    });
  }
  if (e && e.postData && e.postData.contents && String(e.postData.type || '').indexOf('json') !== -1) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      Object.keys(parsed || {}).forEach(function(key) {
        values[key] = parsed[key];
      });
    } catch (error) {
      throw new Error('El cos JSON de la peticio no es valid: ' + error.message);
    }
  }
  return normalizePrefillAliases_(values);
}

function normalizePrefillAliases_(values) {
  var out = Object.assign({}, values || {});
  var aliases = {
    estudis: 'studyType',
    major_edat: 'isAdult',
    major_14: 'is14Plus',
    nom_alumne: 'alumne_nom',
    document_alumne: 'alumne_document',
    student_id: 'id_student',
    id_alumne: 'id_student',
    mode: 'form_mode'
  };
  Object.keys(aliases).forEach(function(alias) {
    if ((out[aliases[alias]] === undefined || out[aliases[alias]] === '') && out[alias] !== undefined) {
      out[aliases[alias]] = out[alias];
    }
  });
  return out;
}

function normalizePrefillValue_(key, value) {
  var text = String(value === null || value === undefined ? '' : value).trim();
  if (key === 'studyType') {
    return ['eso', 'batx', 'fp'].indexOf(text) !== -1 ? text : '';
  }
  if (key === 'isAdult' || key === 'is14Plus') {
    return normalizeSiNo_(text);
  }
  return text;
}

function normalizeSiNo_(value) {
  var text = String(value || '').trim().toLowerCase();
  if (['si', 'sí', 'true', '1', 'yes'].indexOf(text) !== -1) return 'si';
  if (['no', 'false', '0'].indexOf(text) !== -1) return 'no';
  return '';
}

function authorizeServices() {
  var databaseId = getRequiredScriptProperty_('db');
  var registry = loadRegistry_();
  SpreadsheetApp.openById(databaseId).getName();
  SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableAuthorizations)).getName();
  SpreadsheetApp.openById(requireRegistryEntry_(registry, FORM_CONFIG.tableDinantia)).getSheetByName(FORM_CONFIG.sheetAuthorizationsCache).getName();
  PropertiesService.getScriptProperties().getProperties();
  UrlFetchApp.fetch('https://www.google.com/generate_204', { muteHttpExceptions: true });
  return 'Authorization OK';
}
