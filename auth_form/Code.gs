function doGet() {
  return renderForm_({});
}

function doPost(e) {
  return renderForm_(parsePrefillFromEvent_(e));
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function renderForm_(prefill) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialFormDataJson = JSON.stringify(resolveInitialFormData_(prefill || {}));
  return template
    .evaluate()
    .setTitle('Autoritzacions, declaracions i comunicacions')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function submitAuthorizationResponse(payload) {
  return saveAuthorizationResponse_(payload || {});
}

function resolveInitialFormData_(prefill) {
  var initial = Object.assign({}, FORM_DEFAULTS);
  var accepted = ['studyType', 'isAdult', 'is14Plus', 'alumne_nom', 'alumne_document', 'id_student'];
  accepted.forEach(function(key) {
    if (prefill[key] !== undefined && prefill[key] !== null && String(prefill[key]).trim() !== '') {
      initial[key] = normalizePrefillValue_(key, prefill[key]);
    }
  });
  initial.data_signatura = Utilities.formatDate(new Date(), FORM_CONFIG.timezone, 'yyyy-MM-dd');
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
    id_alumne: 'id_student'
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
  return 'Authorization OK';
}
