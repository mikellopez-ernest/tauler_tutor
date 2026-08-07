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
  var confirmationEmail = sendSubmissionConfirmationEmailSafely_(normalized, people, tokenRecord, updateExisting);

  return {
    ok: true,
    resposta_id: respostaId,
    persones_autoritzades: people.length,
    updated: updateExisting,
    confirmation_email_sent: confirmationEmail.sent,
    confirmation_email_error: confirmationEmail.error
  };
}

function sendSubmissionConfirmationEmailSafely_(response, people, tokenRecord, updateExisting) {
  try {
    return { sent: sendSubmissionConfirmationEmail_(response, people, tokenRecord, updateExisting), error: '' };
  } catch (error) {
    console.error('Submission confirmation email failed: ' + (error && error.stack ? error.stack : error));
    return { sent: false, error: String(error && error.message ? error.message : error || '') };
  }
}

function sendSubmissionConfirmationEmail_(response, people, tokenRecord, updateExisting) {
  var recipient = normalizeEmail_((tokenRecord && tokenRecord.email) || response.updated_by_email || response.submitted_by_email);
  if (!recipient) return false;
  var studentName = String(response.alumne_nom || '').trim();
  var subject = FORM_CONFIG.confirmationEmailSubjectPrefix + (studentName ? ' - ' + studentName : '');
  var body = buildSubmissionConfirmationPlainText_(response, people, updateExisting);
  var htmlBody = buildSubmissionConfirmationHtml_(response, people, updateExisting);
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: FORM_CONFIG.confirmationEmailFromName
  });
  return true;
}

function buildSubmissionConfirmationPlainText_(response, people, updateExisting) {
  var lines = [
    'Benvolgut/da,',
    '',
    updateExisting
      ? 'La teva resposta del formulari d’autoritzacions ha estat actualitzada correctament.'
      : 'La teva resposta del formulari d’autoritzacions ha estat enregistrada correctament.',
    '',
    'Alumne/a: ' + displayValue_(response.alumne_nom),
    'Referència: ' + displayValue_(response.resposta_id),
    'Data: ' + displayValue_(response.data_hora_enviament || response.updated_at),
    '',
    'Resum de respostes:'
  ];
  submissionEmailSections_(response, people).forEach(function(section) {
    lines.push('');
    lines.push(section.title);
    section.items.forEach(function(item) {
      lines.push('- ' + item.label + ': ' + item.value);
    });
  });
  lines.push('');
  lines.push('Si detectes alguna errada o tens qualsevol dubte, posa’t en contacte amb el centre: ' + FORM_DEFAULTS.centre_email);
  lines.push('');
  lines.push('Institut Ernest Lluch i Martín');
  return lines.join('\n');
}

function buildSubmissionConfirmationHtml_(response, people, updateExisting) {
  var title = updateExisting ? 'Resposta actualitzada' : 'Resposta enregistrada';
  var sectionsHtml = submissionEmailSections_(response, people).map(function(section) {
    var items = section.items.map(function(item) {
      return '<tr><th style="width:44%;text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:600;">'
        + escapeHtml_(item.label)
        + '</th><td style="vertical-align:top;padding:8px;border-bottom:1px solid #e5e7eb;">'
        + escapeHtml_(item.value)
        + '</td></tr>';
    }).join('');
    return '<h2 style="font-size:18px;margin:28px 0 8px;color:#111827;">' + escapeHtml_(section.title) + '</h2>'
      + '<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">' + items + '</table>';
  }).join('');
  return '<!doctype html><html lang="ca"><body style="margin:0;background:#f5f7fb;color:#17202a;font-family:Arial,sans-serif;line-height:1.5;">'
    + '<div style="max-width:820px;margin:0 auto;padding:24px;">'
    + '<div style="background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:26px;">'
    + '<h1 style="font-size:24px;margin:0 0 12px;color:#111827;">' + escapeHtml_(title) + '</h1>'
    + '<p style="margin:0 0 18px;">' + escapeHtml_(updateExisting ? 'La teva resposta del formulari d’autoritzacions ha estat actualitzada correctament.' : 'La teva resposta del formulari d’autoritzacions ha estat enregistrada correctament.') + '</p>'
    + '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:20px;">'
    + '<div><strong>Alumne/a:</strong> ' + escapeHtml_(displayValue_(response.alumne_nom)) + '</div>'
    + '<div><strong>Referència:</strong> ' + escapeHtml_(displayValue_(response.resposta_id)) + '</div>'
    + '<div><strong>Data:</strong> ' + escapeHtml_(displayValue_(response.data_hora_enviament || response.updated_at)) + '</div>'
    + '</div>'
    + sectionsHtml
    + '<p style="margin-top:24px;">Si detectes alguna errada o tens qualsevol dubte, posa’t en contacte amb el centre: <a href="mailto:' + escapeHtml_(FORM_DEFAULTS.centre_email) + '">' + escapeHtml_(FORM_DEFAULTS.centre_email) + '</a>.</p>'
    + '<p style="margin:22px 0 0;">Institut Ernest Lluch i Martín</p>'
    + '</div></div></body></html>';
}

function submissionEmailSections_(response, people) {
  return [
    {
      title: 'Identificació',
      items: [
        emailItem_('Idioma del formulari', response.idioma_formulari),
        emailItem_('Tipus d’alumne/a', response.tipus_alumne),
        emailItem_('Curs', [response.curs_inici, response.curs_fi].filter(Boolean).join('-')),
        emailItem_('Centre', response.centre_nom),
        emailItem_('Codi del centre', response.centre_codi),
        emailItem_('Municipi', response.municipi),
        emailItem_('Nom i cognoms de l’alumne/a', response.alumne_nom),
        emailItem_('DNI/NIE/Passaport de l’alumne/a', response.alumne_document),
        emailItem_('Nom i cognoms de la persona que respon', response.responent_nom_sencer),
        emailItem_('Telèfon de la persona que respon', response.responent_telefon),
        emailItem_('Nom i cognoms del pare, mare o tutor/a legal', response.responsable_nom),
        emailItem_('DNI/NIE/Passaport del pare, mare o tutor/a legal', response.responsable_document)
      ]
    },
    {
      title: 'Autoritzacions per a l’estada de l’alumnat al centre',
      items: [
        emailItem_('Sortida del centre fora de l’horari lectiu', response.sortida_sola),
        emailItem_('Sortida del centre en hores d’esbarjo', response.sortida_esbarjo),
        emailItem_('Entrada o sortida en situacions imprevistes', response.sortida_imprevistos),
        emailItem_('Persones autoritzades per recollir l’alumne/a', formatAuthorizedPeopleForEmail_(people)),
        emailItem_('Comunicació acadèmica a una tercera persona', response.comunicacio_academica),
        emailItem_('Persona de contacte acadèmic', response.acad_contacte_nom),
        emailItem_('Email de contacte acadèmic', response.acad_contacte_email),
        emailItem_('Relació del contacte acadèmic', response.acad_contacte_relacio),
        emailItem_('Sortides pedagògiques dins del terme municipal', response.sortides_municipi)
      ]
    },
    {
      title: 'Publicacions: protecció de dades i propietat intel·lectual',
      items: [
        emailItem_('Imatge/veu en intranet amb accés restringit', response.imatge_intranet),
        emailItem_('Imatge/veu a Internet amb accés obert', response.imatge_web),
        emailItem_('Imatge/veu en plataformes no administrades pel centre', response.imatge_externa),
        emailItem_('Plataformes o accés', response.plataformes_externes),
        emailItem_('Publicació d’inicials de l’alumne/a i del centre', response.publicacio_inicials),
        emailItem_('Material elaborat en plataformes d’accés obert', response.obra_oberta),
        emailItem_('Obra elaborada en espais de comunicació del centre', response.obra_centre),
        emailItem_('Preservació a la biblioteca física o digital del centre', response.obra_biblioteca),
        emailItem_('Preservació al repositori del Departament', response.obra_repositori)
      ]
    },
    {
      title: 'Plataformes i eines digitals',
      items: [
        emailItem_('Declaració sobre plataformes i eines digitals', response.declaracio_plataformes)
      ]
    },
    {
      title: 'Autoritzacions de salut',
      items: [
        emailItem_('Persona de contacte en cas d’emergència', response.emergencia_nom),
        emailItem_('Telèfon d’emergència', response.emergencia_telefon),
        emailItem_('Relació de la persona d’emergència', response.emergencia_relacio),
        emailItem_('Comunicació de dades de salut rellevants', response.comunicacio_salut),
        emailItem_('Problemes de salut diagnosticats', response.problemes_salut),
        emailItem_('Altres aspectes de salut', response.altres_salut),
        emailItem_('Medicació en horari lectiu', response.medicacio),
        emailItem_('Posologia', response.posologia),
        emailItem_('Dosi', response.dosi),
        emailItem_('Autorització d’administració de medicació', response.administracio_medicacio),
        emailItem_('Autorització d’administració de paracetamol', response.paracetamol)
      ]
    },
    {
      title: 'Compromisos i signatures',
      items: [
        emailItem_('Carta de compromís educatiu acceptada', response.carta_compromis_acceptada),
        emailItem_('Consentiment particular de telèfon mòbil', response.consentiment_mobil),
        emailItem_('Lloc', response.lloc),
        emailItem_('Data de signatura', response.data_signatura),
        emailItem_('Signatura del responsable', response.signatura_responsable),
        emailItem_('Signatura de l’alumne/a', response.signatura_alumne)
      ]
    }
  ].map(function(section) {
    section.items = section.items.filter(function(item) { return item.value !== '-'; });
    if (!section.items.length) section.items = [emailItem_('Sense dades registrades', '')];
    return section;
  });
}

function emailItem_(label, value) {
  return { label: label, value: displayValue_(value) };
}

function displayValue_(value) {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  var text = String(value === null || value === undefined ? '' : value).trim();
  return text || '-';
}

function formatAuthorizedPeopleForEmail_(people) {
  if (!people || !people.length) return '';
  return people.map(function(person) {
    var name = String(person.nom_sencer || '').trim();
    var relation = String(person.qualitat_de || '').trim();
    return [name, relation].filter(Boolean).join(' - ');
  }).filter(Boolean).join('; ');
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
    'sortida_sola','sortida_esbarjo','sortida_imprevistos','comunicacio_academica','sortides_municipi','imatge_intranet','imatge_web','imatge_externa',
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
  if (String(prefill.form_session || '').trim()) {
    var sessionRecord = validateFormSession_(prefill.form_session);
    assertTokenMatchesPayload_(sessionRecord, prefill);
    return sessionRecord;
  }
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
  var record;
  if (String(payload.form_session || '').trim()) {
    record = validateFormSession_(payload.form_session);
  } else {
    var token = String(payload.launcher_token || '').trim();
    if (!token) throw new Error('Missing launcher verification token.');
    record = validateLauncherToken_(token);
  }
  assertTokenMatchesPayload_(record, payload);
  if (mode === 'edit_owner' && codeKey_(record.dinantia_account_id) !== codeKey_(payload.verified_dinantia_account_id)) {
    throw new Error('Launcher token does not match the original respondent.');
  }
  return record;
}

function resolveFormSessionPrefillIfPresent_(prefill) {
  var rawSession = String(prefill && prefill.form_session || '').trim();
  if (!rawSession) return prefill || {};
  var record = validateFormSession_(rawSession);
  var metadata = parseJsonSafe_(record.metadata_json);
  var session = metadata.form_session || {};
  var payload = Object.assign({}, session.payload || {});
  payload.form_session = rawSession;
  if (!payload.form_mode && payload.mode) payload.form_mode = payload.mode;
  if (!payload.id_student && record.student_id) payload.id_student = record.student_id;
  if (!payload.resposta_id && record.resposta_id) payload.resposta_id = record.resposta_id;
  payload.verified_actor_type = record.sender === 'student' ? 'student' : 'parent';
  payload.verified_dinantia_account_id = record.dinantia_account_id || '';
  payload.verified_email = record.email || '';
  if (record.sender === 'parent') {
    if (!payload.responent_nom_sencer && metadata.parent_name) payload.responent_nom_sencer = metadata.parent_name;
    if (!payload.responent_telefon && metadata.parent_phone) payload.responent_telefon = metadata.parent_phone;
    if (!payload.responsable_nom && metadata.parent_name) payload.responsable_nom = metadata.parent_name;
  }
  return normalizePrefillAliases_(payload);
}

function validateFormSession_(rawSession) {
  var record = findFormSessionRecord_(rawSession);
  if (record.status === 'revoked') throw new Error('Launcher token revoked.');
  if (record.status === 'used') throw new Error('Launcher token already used.');
  var tokenExpires = new Date(record.expires_at).getTime();
  if (tokenExpires < new Date().getTime()) throw new Error('Launcher token expired.');
  var session = (parseJsonSafe_(record.metadata_json).form_session || {});
  var sessionExpires = new Date(session.expires_at).getTime();
  if (sessionExpires && sessionExpires < new Date().getTime()) throw new Error('Launcher token expired.');
  return record;
}

function findFormSessionRecord_(rawSession) {
  var hash = hashLauncherToken_(rawSession);
  var sheet = openTableSheetFromRegistry_(FORM_CONFIG.tableAuthorizations, FORM_CONFIG.sheetVerificationTokens);
  var h = getHeaderMap_(sheet);
  requireHeaders_(h, ['token_hash', 'status', 'expires_at', 'sender', 'email', 'student_id', 'resposta_id', 'metadata_json'], FORM_CONFIG.sheetVerificationTokens);
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    var record = objectFromRow_(values[i], h);
    var session = (parseJsonSafe_(record.metadata_json).form_session || {});
    if (String(session.session_hash || '').trim() !== hash) continue;
    record._rowNumber = i + 1;
    return record;
  }
  throw new Error('Launcher token not found.');
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
  var record = tokenRecord;
  if (!record) {
    record = String(payload.form_session || '').trim()
      ? validateFormSession_(payload.form_session)
      : validateLauncherToken_(String(payload.launcher_token || '').trim());
  }
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

function parseJsonSafe_(value) {
  try {
    return JSON.parse(String(value || '{}')) || {};
  } catch (error) {
    return {};
  }
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
