function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Contacts')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function loadContactsJson() {
  try {
    return JSON.stringify({
      ok: true,
      contacts: loadContactsFromCache_()
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'only_contacts_load_failed',
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : ''
    }));
    return JSON.stringify({
      ok: false,
      error: publicContactsError_(error)
    });
  }
}

function publicContactsError_(error) {
  var message = error && error.message ? String(error.message) : String(error || '');

  if (/Missing required script property/i.test(message)) {
    return {
      code: 'CONFIG_MISSING',
      title: APP_CONFIG.genericErrorTitle,
      message: 'La configuracio del servei no esta completa. Contacta amb el centre.'
    };
  }

  if (/Missing logical table|Missing sheet|Missing required header/i.test(message)) {
    return {
      code: 'CACHE_CONFIG',
      title: APP_CONFIG.genericErrorTitle,
      message: 'La cache de contactes no esta configurada correctament. Contacta amb el centre.'
    };
  }

  if (/permission|permis|authorization|authorization is required|access denied|not have access/i.test(message)) {
    return {
      code: 'PERMISSION_REQUIRED',
      title: APP_CONFIG.genericErrorTitle,
      message: "Cal autoritzar el servei abans de carregar els contactes. Contacta amb el centre."
    };
  }

  return {
    code: 'LOAD_FAILED',
    title: APP_CONFIG.genericErrorTitle,
    message: "No s'han pogut carregar els contactes."
  };
}

function diagnoseOnlyContactsSetup() {
  var report = {
    ok: false,
    dbPropertyPresent: false,
    registryReadable: false,
    dinantiaRegistered: false,
    contactsCacheReadable: false,
    requiredHeadersPresent: false,
    rowCount: 0,
    error: ''
  };

  try {
    report.dbPropertyPresent = !!String(PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTIES.databaseId) || '').trim();
    var registry = loadTableRegistry_();
    report.registryReadable = true;
    report.dinantiaRegistered = !!registry[TABLES.dinantia];
    var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.contactsCache);
    report.contactsCacheReadable = true;
    requireHeaders_(sheet, [
      'student_id', 'student_name', 'group_name', 'contact_id', 'contact_position',
      'contact_name', 'contact_email', 'contact_phone'
    ], TABLES.dinantia + ' -> ' + SHEETS.contactsCache);
    report.requiredHeadersPresent = true;
    report.rowCount = Math.max(0, sheet.getLastRow() - 1);
    report.ok = true;
  } catch (error) {
    report.error = error && error.message ? error.message : String(error);
  }

  return report;
}

function authorizeOnlyContactsServices() {
  var result = diagnoseOnlyContactsSetup();
  if (result.ok !== true) {
    throw new Error('Only Contacts authorization/setup check failed: ' + (result.error || 'Unknown error'));
  }
  return result;
}
