function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.token) return handleTokenGet_(params.token);
    var sender = normalizeSender_(params.sender);
    if (!sender) return renderSenderChoice_();
    if (sender === 'student') return renderStudentEntry_();
    return renderParentEntry_();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderMessagePage_('No s ha pogut obrir el formulari', 'S ha produit un error: ' + safeErrorMessage_(error), true);
  }
}

function doPost(e) {
  try {
    var payload = parseRequest_(e);
    var action = stringValue_(payload.action);
    if (action === 'verify_parent') return handleParentVerification_(payload);
    if (action === 'verify_student') return handleStudentVerification_(payload);
    if (action === 'select_parent_student') return handleParentStudentSelection_(payload);
    if (action === 'forward_form') return handleForwardForm_(payload);
    if (action === 'confirm_student') return handleStudentConfirmation_(payload);
    return renderMessagePage_('No s ha pogut continuar', 'La peticio no es valida.', true);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderMessagePage_('No s ha pogut continuar', 'S ha produit un error: ' + safeErrorMessage_(error), true);
  }
}

function handleParentVerification_(payload) {
  var email = normalizeEmail_(payload.email);
  if (!isValidEmail_(email)) return renderParentEntry_('Introdueix una adreca de correu electronic valida.');

  var parent = findDinantiaAccountByEmail_(email);
  if (!parent) return renderNotRegistered_();

  var children = findStudentsForParent_(parent.id);
  if (!children.length) return renderNotRegistered_();

  var token = createVerificationToken_({
    sender: 'parent',
    email: email,
    dinantia_account_id: parent.id,
    student_id: '',
    resposta_id: '',
    metadata: { parent_name: parent.name || '', children: children }
  });
  sendVerificationEmail_(email, 'parent', token.rawToken);
  return renderCheckEmail_();
}

function handleStudentVerification_(payload) {
  var email = normalizeEmail_(payload.email);
  var groupName = stringValue_(payload.group);
  if (!isValidEmail_(email) || !/@iernestlluch\.cat$/i.test(email)) {
    return renderStudentEntry_('Introdueix una adreca de correu electronic del centre valida.');
  }
  if (!groupName) return renderStudentEntry_('Selecciona el teu curs o grup.');

  var group = getClassGroupByName_(groupName);
  if (!group) return renderStudentEntry_('El curs o grup seleccionat no es valid.');
  var student = findLocalStudentByEmail_(group.dades_alumnes_sheet, email);
  if (!student) return renderStudentNotRegistered_();

  var auth = findLatestAuthorizationByStudentId_(student.id);
  var isAdult = calculateAge_(student.birthdateIso) >= 18;
  if (!isAdult && !auth) return renderStudentNeedsParent_();

  var token = createVerificationToken_({
    sender: 'student',
    email: email,
    dinantia_account_id: student.id,
    student_id: student.id,
    resposta_id: auth ? auth.resposta_id : '',
    metadata: {
      student: student,
      auth: auth || null,
      isAdult: isAdult,
      group: groupName,
      dades_alumnes_sheet: group.dades_alumnes_sheet
    }
  });
  sendVerificationEmail_(email, 'student', token.rawToken);
  return renderCheckEmail_();
}

function handleTokenGet_(rawToken) {
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  var metadata = parseJson_(record.metadata_json) || {};
  if (record.sender === 'parent') {
    var children = metadata.children || [];
    if (children.length > 1 && !record.student_id) return renderParentStudentChoice_(rawToken, children);
    var child = children[0] || metadata.student || null;
    if (!child) return renderMessagePage_('No s ha pogut continuar', 'No s ha pogut identificar cap alumne associat.', true);
    return renderParentStudentOutcome_(rawToken, child);
  }
  if (record.sender === 'student') return renderStudentOutcome_(rawToken, metadata.student, metadata.auth, metadata.isAdult);
  return renderMessagePage_('Enllac no valid', 'Aquest enllac de verificacio no es valid.', true);
}

function handleParentStudentSelection_(payload) {
  var rawToken = stringValue_(payload.token);
  var studentId = stringValue_(payload.student_id);
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  if (record.sender !== 'parent') return renderMessagePage_('Enllac no valid', 'Aquest enllac no correspon a un acces familiar.', true);
  var metadata = parseJson_(record.metadata_json) || {};
  var child = (metadata.children || []).filter(function(item) { return String(item.id) === String(studentId); })[0];
  if (!child) return renderMessagePage_('No s ha pogut continuar', 'L alumne seleccionat no correspon a aquest enllac.', true);
  return renderParentStudentOutcome_(rawToken, child);
}

function renderParentStudentOutcome_(rawToken, child) {
  var detailed = enrichStudentForLauncher_(child);
  var auth = findLatestAuthorizationByStudentId_(detailed.id);
  if (Number(detailed.age) >= 18) {
    return renderMessagePage_('Alumne/a major d edat', 'Aquest formulari ha de ser emplenat pel mateix alumne/a perquè es major d edat. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.', false);
  }
  if (auth) {
    return renderReadonlyAuthorization_(auth, 'Aquest formulari ja consta com a emplenat.', 'Podeu consultar-ne la informacio en mode nomes lectura. Si detecteu alguna errada o voleu fer qualsevol consulta o reclamacio, poseu-vos en contacte amb el centre.', null, rawToken);
  }
  var payload = formPayloadFromStudent_(detailed);
  return renderFamilyMessage_(rawToken, payload);
}

function renderStudentOutcome_(rawToken, student, auth, isAdult) {
  if (isAdult && !auth) return renderFamilyMessage_(rawToken, formPayloadFromStudent_(student));
  if (!auth) return renderStudentNeedsParent_();
  var action = parseBooleanValue_(auth.signatura_alumne) === true ? null : { token: rawToken, resposta_id: auth.resposta_id };
  var title = action ? 'Confirma el formulari' : 'Confirmacio ja registrada';
  var message = action ? 'Revisa la informacio en mode nomes lectura i confirma la teva conformitat.' : 'La teva confirmacio ja consta registrada.';
  return renderReadonlyAuthorization_(auth, title, message, action, rawToken);
}

function handleForwardForm_(payload) {
  var rawToken = stringValue_(payload.token);
  validateToken_(rawToken, { allowPendingOnly: true });
  markTokenUsed_(rawToken);
  var formPayload = parseJson_(payload.form_payload_json) || {};
  return renderAutoPostToForm_(formPayload);
}

function handleStudentConfirmation_(payload) {
  var rawToken = stringValue_(payload.token);
  var respostaId = stringValue_(payload.resposta_id);
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  if (record.sender !== 'student') return renderMessagePage_('No s ha pogut confirmar', 'Aquest enllac no correspon a una confirmacio d alumne.', true);
  updateStudentSignature_(record.student_id, respostaId);
  markTokenUsed_(rawToken);
  return renderMessagePage_('Confirmacio registrada', 'La teva conformitat ha quedat registrada correctament.', false);
}

function renderSenderChoice_() {
  return htmlPage_('Acces al formulari', '<h1>Acces al formulari</h1><p>Selecciona com vols accedir al formulari.</p><div class="actions"><a class="button" href="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl + '?sender=parent') + '">Familia</a><a class="button secondary" href="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl + '?sender=student') + '">Alumne/a</a></div>');
}

function renderParentEntry_(error) {
  var body = '<h1>Verificacio previa de la identitat</h1>' +
    (error ? '<div class="alert">' + escapeHtml_(error) + '</div>' : '') +
    '<p>Benvolguda familia,</p>' +
    '<p>Per tal de poder accedir al formulari d autoritzacions, declaracions i comunicacions, es necessari verificar previament la identitat de la persona que l emplenara.</p>' +
    '<p>Aquest proces ens permet garantir que nomes el pare, la mare, el tutor o la tutora legal de l alumne/a (o el mateix alumne/a, quan sigui major d edat) pot accedir a les seves dades personals, efectuar les declaracions corresponents i signar les autoritzacions requerides.</p>' +
    '<p>Per comencar, introduiu la vostra adreca de correu electronic al camp inferior i premeu el boto <strong>Continuar</strong>.</p>' +
    '<p>Si l adreca introduida correspon a una persona autoritzada, rebreu en pocs instants un missatge de correu electronic amb un enllac personal i segur de verificacio.</p>' +
    '<p>Una vegada hagueu confirmat la vostra identitat mitjancant aquest enllac, podreu accedir al formulari i completar-lo amb totes les garanties de seguretat.</p>' +
    '<p><strong>Important:</strong> si no rebeu el correu electronic al cap d uns minuts, reviseu tambe la carpeta de correu brossa o correu no desitjat. Si despres de revisar-la continueu sense haver-lo rebut, poseu-vos en contacte amb el centre.</p>' +
    '<form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="verify_parent"><label>Correu electronic<span>Introduiu l adreca de correu electronic amb la qual el centre es comunica habitualment amb la vostra familia.</span><input name="email" type="email" required></label><button class="button" type="submit">Continuar</button></form>' +
    '<h2>Proteccio de dades</h2><p class="small">L adreca de correu electronic facilitada s utilitzara exclusivament per verificar la vostra identitat, permetre l acces segur al formulari i enviar-vos les comunicacions necessaries relacionades amb aquest proces. Les dades seran tractades pel centre educatiu d acord amb la normativa vigent en materia de proteccio de dades personals i no s utilitzaran per a finalitats diferents de les derivades de la gestio administrativa i educativa del centre.</p>';
  return htmlPage_('Verificacio previa de la identitat', body);
}

function renderStudentEntry_(error) {
  var groups = getClassGroups_();
  var options = groups.map(function(group) { return '<option value="' + escapeHtml_(group.dinantia_group_name) + '">' + escapeHtml_(group.dinantia_group_name) + '</option>'; }).join('');
  var body = '<h1>Acces al formulari d autoritzacions</h1>' +
    (error ? '<div class="alert">' + escapeHtml_(error) + '</div>' : '') +
    '<p>Benvolgut/da,</p>' +
    '<p>Algunes de les autoritzacions i declaracions relatives al curs escolar tambe requereixen la conformitat de l alumnat que ha complert els 14 anys.</p>' +
    '<p>Per aquest motiu, abans d accedir al formulari es necessari verificar la teva identitat.</p>' +
    '<p>Per comencar, introdueix la teva adreca de correu electronic i selecciona el curs o grup al qual pertanys aquest curs escolar. Amb aquesta informacio podrem localitzar el teu expedient i comprovar si hi ha un formulari pendent de la teva confirmacio.</p>' +
    '<p>Si les dades son correctes, rebras un correu electronic amb un enllac personal i segur que et permetra continuar el proces.</p>' +
    '<p><strong>Important:</strong> si no reps el correu electronic al cap d uns minuts, revisa tambe la carpeta de correu brossa o correu no desitjat. Si despres de revisar-la continues sense haver-lo rebut, posa t en contacte amb el centre.</p>' +
    '<form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="verify_student"><label>Correu electronic<span>Introdueix l adreca de correu electronic que tens registrada al centre educatiu.</span><input name="email" type="email" required></label><label>Curs o grup<span>Selecciona el curs o grup al qual pertanys aquest curs escolar.</span><select name="group" required><option value="">Selecciona el teu curs o grup</option>' + options + '</select></label><button class="button" type="submit">Continuar</button></form>' +
    '<h2>Proteccio de dades</h2><p class="small">L adreca de correu electronic i el curs o grup facilitats s utilitzaran exclusivament per verificar la teva identitat, localitzar el teu expedient academic i gestionar el proces d autoritzacions i declaracions del centre. Les dades seran tractades d acord amb la normativa vigent en materia de proteccio de dades personals i unicament per a finalitats administratives i educatives relacionades amb aquest procediment.</p>';
  return htmlPage_('Acces al formulari d autoritzacions', body);
}

function renderParentStudentChoice_(token, children) {
  var options = children.map(function(child) { return '<option value="' + escapeHtml_(child.id) + '">' + escapeHtml_(child.name || child.id) + '</option>'; }).join('');
  var body = '<h1>Selecciona l alumne/a</h1><p>Hem trobat mes d un alumne/a associat a aquesta adreca. Selecciona per a qui vols accedir al formulari.</p><form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="select_parent_student"><input type="hidden" name="token" value="' + escapeHtml_(token) + '"><label>Alumne/a<select name="student_id" required>' + options + '</select></label><button class="button" type="submit">Continuar</button></form>';
  return htmlPage_('Selecciona l alumne/a', body);
}

function renderNotRegistered_() {
  return renderMessagePage_('Correu no registrat', 'L adreca de correu electronic introduida no consta registrada a Dinantia. Utilitzeu una adreca de correu electronic registrada al centre, o poseu-vos en contacte amb l institut si teniu dubtes.', true);
}

function renderStudentNotRegistered_() {
  return renderMessagePage_('Dades no trobades', 'No hem pogut localitzar cap alumne/a amb aquest correu electronic dins del grup seleccionat. Utilitza el correu i el grup registrats al centre, o posa t en contacte amb l institut si tens dubtes.', true);
}

function renderStudentNeedsParent_() {
  return renderMessagePage_('Formulari familiar pendent', 'Encara no consta cap formulari d autoritzacions emplenat per a aquest alumne/a. Demana al teu pare, mare, tutor o tutora legal que empleni primer el formulari. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.', true);
}

function renderCheckEmail_() {
  return renderMessagePage_('Revisa el correu electronic', 'Si l adreca indicada correspon a una persona autoritzada, rebreu un correu electronic amb l enllac de verificacio.', false);
}

function renderFamilyMessage_(token, payload) {
  var formPayloadJson = JSON.stringify(payload || {});
  var body = '<p>Benvolguda familia,</p><p>Per tal d iniciar correctament el curs escolar i mantenir actualitzada la informacio de l alumnat, us demanem que empleneu el formulari d autoritzacions, declaracions i comunicacions corresponent al vostre fill o filla.</p><p>En aquest formulari podreu:</p><ul><li>revisar i actualitzar les dades basiques;</li><li>autoritzar les diferents activitats i serveis del centre;</li><li>indicar persones autoritzades per recollir l alumne/a;</li><li>facilitar la informacio sanitaria rellevant;</li><li>signar electronicament les autoritzacions.</li></ul><p>Per accedir al formulari, feu clic al seguent boto:</p><form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="forward_form"><input type="hidden" name="token" value="' + escapeHtml_(token) + '"><input type="hidden" name="form_payload_json" value="' + escapeHtml_(formPayloadJson) + '"><button class="button" type="submit">EMPLENAR EL FORMULARI</button></form><p>Temps aproximat: 10 minuts.</p><p>Es important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informacio sera utilitzada durant tot el curs escolar.</p><p>Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d acord amb la normativa vigent en materia de proteccio de dades personals.</p><p>Si teniu qualsevol incidencia tecnica o dubte sobre el formulari, podeu contactar amb el centre a traves del correu:</p><p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p><p>Moltes gracies per la vostra col·laboracio.</p><p>Cordialment,</p><p>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>';
  return htmlPage_('Formulari d autoritzacions', body);
}

function renderReadonlyAuthorization_(auth, title, message, studentAction, token) {
  var rows = Object.keys(auth || {}).filter(function(key) { return auth[key] !== '' && auth[key] !== null && auth[key] !== undefined; }).map(function(key) {
    return '<tr><th>' + escapeHtml_(key) + '</th><td>' + escapeHtml_(formatValue_(auth[key])) + '</td></tr>';
  }).join('');
  var action = '';
  if (studentAction) {
    action = '<form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="confirm_student"><input type="hidden" name="token" value="' + escapeHtml_(studentAction.token) + '"><input type="hidden" name="resposta_id" value="' + escapeHtml_(studentAction.resposta_id) + '"><button class="button" type="submit">Confirmo</button></form>';
  }
  return htmlPage_(title, '<h1>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p><div class="table-wrap"><table>' + rows + '</table></div>' + action);
}

function renderAutoPostToForm_(payload) {
  var inputs = Object.keys(payload || {}).map(function(key) {
    return '<input type="hidden" name="' + escapeHtml_(key) + '" value="' + escapeHtml_(payload[key]) + '">';
  }).join('');
  var body = '<h1>Obrint el formulari...</h1><p>Si el formulari no s obre automaticament, prem el boto.</p><form id="forwardForm" method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.authFormUrl) + '">' + inputs + '<button class="button" type="submit">Obrir formulari</button></form><script>document.getElementById("forwardForm").submit();</script>';
  return htmlPage_('Obrint el formulari', body);
}

function renderMessagePage_(title, message, isError) {
  return htmlPage_(title, '<h1' + (isError ? ' class="danger"' : '') + '>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p>');
}

function htmlPage_(title, body) {
  return HtmlService.createHtmlOutput('<!doctype html><html lang="ca"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml_(title) + '</title><style>body{margin:0;background:#f6f7f9;color:#17202a;font-family:Arial,sans-serif;line-height:1.5}main{width:min(820px,calc(100% - 32px));margin:32px auto;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:30px;box-shadow:0 16px 40px rgba(21,34,50,.10)}h1{font-size:28px;line-height:1.2;margin:0 0 18px}h2{font-size:18px;margin-top:28px}.danger{color:#b42318}.alert{border:1px solid #f0b4b4;background:#fff1f1;color:#b42318;border-radius:6px;padding:10px 12px;margin-bottom:18px}label{display:block;font-weight:700;margin:18px 0}label span{display:block;color:#617080;font-size:14px;font-weight:400;margin:4px 0 8px}input,select{width:100%;border:1px solid #ccd6e0;border-radius:6px;font:inherit;padding:11px 12px}.button{display:inline-block;border:0;border-radius:6px;background:#0f766e;color:#fff;cursor:pointer;font-size:16px;font-weight:800;padding:13px 18px;text-decoration:none}.button.secondary{background:#344354}.actions{display:flex;gap:12px;flex-wrap:wrap}.small{color:#617080;font-size:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d9e0e8;padding:9px 10px;text-align:left;vertical-align:top}th{width:230px;background:#edf1f5}</style></head><body><main>' + body + '</main></body></html>')
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function parseRequest_(e) {
  var payload = {};
  if (e && e.parameter) Object.keys(e.parameter).forEach(function(key) { payload[key] = e.parameter[key]; });
  if (e && e.postData && e.postData.contents && String(e.postData.type || '').indexOf('json') !== -1) {
    var parsed = JSON.parse(e.postData.contents);
    Object.keys(parsed || {}).forEach(function(key) { payload[key] = parsed[key]; });
  }
  return payload;
}

function getRegistry_() {
  var dbId = getRequiredProperty_(LAUNCHER_CONFIG.databaseProperty);
  var sheet = SpreadsheetApp.openById(dbId).getSheetByName(LAUNCHER_CONFIG.registrySheet);
  if (!sheet) throw new Error('Missing registry sheet: ' + LAUNCHER_CONFIG.registrySheet);
  var values = sheet.getDataRange().getValues();
  var registry = {};
  for (var i = 1; i < values.length; i++) {
    var name = stringValue_(values[i][0]);
    var id = stringValue_(values[i][1]);
    if (name && id) registry[name] = id;
  }
  return registry;
}

function openTableSheet_(tableName, sheetName) {
  var registry = getRegistry_();
  if (!registry[tableName]) throw new Error('Missing logical table: ' + tableName);
  var sheet = SpreadsheetApp.openById(registry[tableName]).getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + tableName + ' -> ' + sheetName);
  return sheet;
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(header, index) { var key = stringValue_(header); if (key) map[key] = index; });
  return map;
}

function getClassGroups_() {
  var sheet = openTableSheet_('Dinantia', 'class_groups');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var groups = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var name = stringValue_(row[h.dinantia_group_name]);
    var localSheet = stringValue_(row[h.dades_alumnes_sheet]);
    if (name && localSheet) groups.push({ dinantia_group_name: name, dades_alumnes_sheet: localSheet, tutor_carrec: stringValue_(row[h.tutor_carrec]) });
  }
  return groups.sort(function(a, b) { return a.dinantia_group_name.localeCompare(b.dinantia_group_name, 'ca'); });
}

function getClassGroupByName_(name) {
  var target = stringValue_(name);
  return getClassGroups_().filter(function(group) { return group.dinantia_group_name === target; })[0] || null;
}

function findLocalStudentByEmail_(sheetName, email) {
  var sheet = openTableSheet_('Dades alumnes', sheetName);
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (normalizeEmail_(row[h['Correu alumne']]) === email) return localStudentFromRow_(row, h, sheetName);
  }
  return null;
}

function findLocalStudentById_(studentId) {
  var groups = getClassGroups_();
  for (var i = 0; i < groups.length; i++) {
    var sheet = openTableSheet_('Dades alumnes', groups[i].dades_alumnes_sheet);
    var h = headerMap_(sheet);
    var values = sheet.getDataRange().getValues();
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (codeKey_(row[h.ID]) === codeKey_(studentId)) return localStudentFromRow_(row, h, groups[i].dades_alumnes_sheet);
    }
  }
  return null;
}

function localStudentFromRow_(row, h, sheetName) {
  var birth = normalizeBirthdate_(row[h['Data Naixement']]);
  var name = firstExisting_(row, h, ['Nom complet', 'NOM_COMPLET', 'Alumne', 'Nom i cognoms', 'Nom']);
  return {
    id: stringValue_(row[h.ID]),
    name: name,
    email: normalizeEmail_(row[h['Correu alumne']]),
    birthdate: birth.display,
    birthdateIso: birth.iso,
    age: calculateAge_(birth.iso),
    document: firstExisting_(row, h, ['DNI/NIE/Passaport', 'DNI', 'Document', 'document']),
    studyType: inferStudyType_(sheetName),
    isAdult: calculateAge_(birth.iso) >= 18 ? 'si' : 'no',
    is14Plus: calculateAge_(birth.iso) >= 14 ? 'si' : 'no'
  };
}

function firstExisting_(row, h, headers) {
  for (var i = 0; i < headers.length; i++) if (h[headers[i]] !== undefined) return stringValue_(row[h[headers[i]]]);
  return '';
}

function enrichStudentForLauncher_(student) {
  var local = findLocalStudentById_(student.id) || {};
  return {
    id: student.id || local.id || '',
    name: local.name || student.name || '',
    birthdateIso: local.birthdateIso || '',
    age: local.age !== undefined ? local.age : '',
    document: local.document || '',
    studyType: local.studyType || inferStudyType_(student.name || ''),
    isAdult: local.isAdult || (Number(local.age) >= 18 ? 'si' : 'no'),
    is14Plus: local.is14Plus || (Number(local.age) >= 14 ? 'si' : 'no')
  };
}

function findDinantiaAccountByEmail_(email) {
  var body = fetchDinantiaJson_('/v1.2/accounts/index?email=' + encodeURIComponent(email) + '&limit=10');
  var accounts = body.data || [];
  return accounts.filter(function(account) { return normalizeEmail_(account.email) === email; })[0] || accounts[0] || null;
}

function findStudentsForParent_(parentId) {
  var students = [];
  var page = 1;
  while (true) {
    var body = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=' + page);
    (body.data || []).forEach(function(account) {
      if ((account.roles || []).indexOf('Student') !== -1 && (account.parents || []).map(String).indexOf(String(parentId)) !== -1) {
        students.push({ id: account.id || '', name: account.name || '' });
      }
    });
    if (!body.pagination || !body.pagination.has_next_page) break;
    page++;
  }
  return students;
}

function fetchDinantiaJson_(path) {
  var user = getRequiredProperty_('dinantia_api_user');
  var secret = getRequiredProperty_('dinantia_api_secret');
  var response = UrlFetchApp.fetch(LAUNCHER_CONFIG.dinantiaBaseUrl + path, {
    method: 'get',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(user + ':' + secret), Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' },
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var body = JSON.parse(text);
  if (status < 200 || status >= 300 || body.success === false) throw new Error('Dinantia request failed. HTTP ' + status);
  return body;
}

function findLatestAuthorizationByStudentId_(studentId) {
  var sheet = openTableSheet_('Autoritzacions', 'autoritzacions');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var latest = null;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (codeKey_(row[h.id_student]) !== codeKey_(studentId)) continue;
    var auth = objectFromRow_(row, h);
    auth._rowNumber = i + 1;
    if (!latest || stringValue_(auth.data_hora_enviament) >= stringValue_(latest.data_hora_enviament)) latest = auth;
  }
  return latest;
}

function updateStudentSignature_(studentId, respostaId) {
  var sheet = openTableSheet_('Autoritzacions', 'autoritzacions');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (codeKey_(row[h.id_student]) === codeKey_(studentId) && (!respostaId || stringValue_(row[h.resposta_id]) === respostaId)) {
      sheet.getRange(i + 1, h.signatura_alumne + 1).setValue(true);
      return;
    }
  }
  throw new Error('Authorization row not found for student confirmation.');
}

function objectFromRow_(row, h) {
  var out = {};
  Object.keys(h).forEach(function(key) { out[key] = row[h[key]] instanceof Date ? Utilities.formatDate(row[h[key]], LAUNCHER_CONFIG.timezone, 'yyyy-MM-dd') : row[h[key]]; });
  return out;
}

function createVerificationToken_(data) {
  var raw = Utilities.getUuid() + '-' + Utilities.getUuid();
  var hash = hashToken_(raw);
  var now = new Date();
  var expires = new Date(now.getTime() + LAUNCHER_CONFIG.tokenMinutes * 60 * 1000);
  var sheet = openTableSheet_('Autoritzacions', 'verification_tokens');
  var h = headerMap_(sheet);
  appendByHeaders_(sheet, h, {
    id: 'TOK-' + Utilities.getUuid(),
    created_at: formatDateTime_(now),
    expires_at: formatDateTime_(expires),
    used_at: '',
    token_hash: hash,
    sender: data.sender,
    email: data.email,
    dinantia_account_id: data.dinantia_account_id || '',
    student_id: data.student_id || '',
    resposta_id: data.resposta_id || '',
    status: 'pending',
    metadata_json: JSON.stringify(data.metadata || {})
  });
  return { rawToken: raw, tokenHash: hash };
}

function validateToken_(rawToken, options) {
  var hash = hashToken_(rawToken);
  var sheet = openTableSheet_('Autoritzacions', 'verification_tokens');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (stringValue_(row[h.token_hash]) !== hash) continue;
    var record = objectFromRow_(row, h);
    record._rowNumber = i + 1;
    if (record.status === 'revoked') throw new Error('Token revoked.');
    if (record.status === 'used' && options && options.allowPendingOnly) throw new Error('Token already used.');
    if (new Date(record.expires_at).getTime() < new Date().getTime()) throw new Error('Token expired.');
    return record;
  }
  throw new Error('Token not found.');
}

function markTokenUsed_(rawToken) {
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  var sheet = openTableSheet_('Autoritzacions', 'verification_tokens');
  var h = headerMap_(sheet);
  sheet.getRange(record._rowNumber, h.used_at + 1).setValue(formatDateTime_(new Date()));
  sheet.getRange(record._rowNumber, h.status + 1).setValue('used');
}

function appendByHeaders_(sheet, h, object) {
  var row = new Array(sheet.getLastColumn()).fill('');
  Object.keys(object).forEach(function(key) { if (h[key] !== undefined) row[h[key]] = object[key]; });
  sheet.appendRow(row);
}

function sendVerificationEmail_(email, sender, rawToken) {
  var url = LAUNCHER_CONFIG.launcherUrl + '?token=' + encodeURIComponent(rawToken);
  var subject = sender === 'student' ? 'Enllac de verificacio del formulari d autoritzacions' : 'Formulari d autoritzacions - verificacio';
  var plain = 'Benvolgut/da,\n\nPer continuar el proces d autoritzacions, obre aquest enllac personal i segur:\n\n' + url + '\n\nAquest enllac caduca en ' + LAUNCHER_CONFIG.tokenMinutes + ' minuts.\n\nInstitut Ernest Lluch';
  var html = '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a;max-width:720px">' +
    '<p>Benvolguda familia,</p>' +
    '<p>Per tal d iniciar correctament el curs escolar i mantenir actualitzada la informacio de l alumnat, us demanem que empleneu el formulari d autoritzacions, declaracions i comunicacions corresponent al vostre fill o filla.</p>' +
    '<p>En aquest formulari podreu:</p>' +
    '<ul><li>revisar i actualitzar les dades basiques;</li><li>autoritzar les diferents activitats i serveis del centre;</li><li>indicar persones autoritzades per recollir l alumne/a;</li><li>facilitar la informacio sanitaria rellevant;</li><li>signar electronicament les autoritzacions.</li></ul>' +
    '<p>Per accedir al formulari, feu clic al seguent boto:</p>' +
    '<p><a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;padding:13px 18px;font-weight:800">EMPLENAR EL FORMULARI</a></p>' +
    '<p>Aquest enllac es personal i caduca en ' + LAUNCHER_CONFIG.tokenMinutes + ' minuts.</p>' +
    '<p>Temps aproximat: 10 minuts.</p>' +
    '<p>Es important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informacio sera utilitzada durant tot el curs escolar.</p>' +
    '<p>Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d acord amb la normativa vigent en materia de proteccio de dades personals.</p>' +
    '<p>Si teniu qualsevol incidencia tecnica o dubte sobre el formulari, podeu contactar amb el centre a traves del correu:</p>' +
    '<p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p>' +
    '<p>Moltes gracies per la vostra col·laboracio.</p>' +
    '<p>Cordialment,<br>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>' +
    '</div>';
  MailApp.sendEmail({ to: email, subject: subject, body: plain, htmlBody: html });
}

function formPayloadFromStudent_(student) {
  return { id_student: student.id || '', alumne_nom: student.name || '', alumne_document: student.document || '', studyType: student.studyType || '', isAdult: student.isAdult || '', is14Plus: student.is14Plus || '' };
}

function normalizeBirthdate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return { display: Utilities.formatDate(value, LAUNCHER_CONFIG.timezone, 'dd/MM/yyyy'), iso: Utilities.formatDate(value, LAUNCHER_CONFIG.timezone, 'yyyy-MM-dd') };
  var text = stringValue_(value);
  var m = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return { display: text, iso: [m[3], pad2_(m[2]), pad2_(m[1])].join('-') };
  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return { display: text, iso: [iso[1], pad2_(iso[2]), pad2_(iso[3])].join('-') };
  return { display: text, iso: '' };
}

function calculateAge_(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  var today = new Date();
  var age = today.getFullYear() - Number(p[0]);
  var birthday = new Date(today.getFullYear(), Number(p[1]) - 1, Number(p[2]));
  if (today < birthday) age--;
  return age;
}

function inferStudyType_(value) {
  var text = codeKey_(value);
  if (text.indexOf('BAT') !== -1) return 'batx';
  if (text.indexOf('FP') !== -1 || text.indexOf('SMX') !== -1 || text.indexOf('PCC') !== -1 || text.indexOf('AC ') !== -1 || text.indexOf('PFI') !== -1) return 'fp';
  return 'eso';
}

function parseBooleanValue_(value) {
  if (value === true) return true;
  if (value === false) return false;
  var text = String(value || '').toLowerCase().trim();
  if (['true','si','sí','1','acceptada'].indexOf(text) !== -1) return true;
  if (['false','no','0'].indexOf(text) !== -1) return false;
  return null;
}

function hashToken_(raw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(raw));
  return Utilities.base64EncodeWebSafe(bytes);
}

function formatDateTime_(date) { return Utilities.formatDate(date, LAUNCHER_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function getRequiredProperty_(name) { var value = PropertiesService.getScriptProperties().getProperty(name); if (!stringValue_(value)) throw new Error('Missing script property: ' + name); return stringValue_(value); }
function normalizeSender_(value) { var sender = stringValue_(value).toLowerCase(); return sender === 'parent' || sender === 'student' ? sender : ''; }
function normalizeEmail_(value) { return stringValue_(value).toLowerCase(); }
function isValidEmail_(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue_(value)); }
function stringValue_(value) { return String(value === null || value === undefined ? '' : value).trim(); }
function safeErrorMessage_(error) { return error && error.message ? error.message : String(error); }
function escapeHtml_(value) { return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function(ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
function parseJson_(value) { try { return JSON.parse(value || '{}'); } catch (e) { return {}; } }
function codeKey_(value) { return String(value === null || value === undefined ? '' : value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function pad2_(value) { return String(value).padStart(2, '0'); }
function formatValue_(value) { return value instanceof Date ? Utilities.formatDate(value, LAUNCHER_CONFIG.timezone, 'yyyy-MM-dd') : String(value); }


function authorizeServices() {
  getRegistry_();
  getClassGroups_();
  MailApp.getRemainingDailyQuota();
  PropertiesService.getScriptProperties().getProperties();
  return 'Authorization OK';
}
