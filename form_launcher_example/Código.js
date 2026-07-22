function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.token) return renderTokenLoadingPage_(params.token);
    var sender = normalizeSender_(params.sender);
    if (!sender) return renderSenderChoice_();
    if (sender === 'student') return renderStudentEntry_();
    return renderParentEntry_();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderLauncherError_(error);
  }
}

function doPost(e) {
  try {
    var payload = parseRequest_(e);
    var action = stringValue_(payload.action);
    if (action === 'panel_invite') return handlePanelInvite_(payload);
    if (action === 'panel_print_link') return handlePanelPrintLink_(payload);
    if (action === 'verify_parent') return handleParentVerification_(payload);
    if (action === 'verify_student') return handleStudentVerification_(payload);
    if (action === 'select_parent_student') return handleParentStudentSelection_(payload);
    if (action === 'forward_form') return handleForwardForm_(payload);
    if (action === 'confirm_student') return handleStudentConfirmation_(payload);
    return renderMessagePage_('No s ha pogut continuar', 'La peticio no es valida.', true);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderLauncherError_(error);
  }
}

function resolveTokenHtml(rawToken) {
  try {
    return handleTokenGet_(rawToken).getContent();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderLauncherError_(error).getContent();
  }
}

function handlePanelInvite_(payload) {
  try {
    assertPanelSecret_(payload.secret);
    var target = stringValue_(payload.target) === 'student' ? 'student' : 'parents';
    var student = normalizePanelStudent_(payload.student);
    var contacts = normalizePanelContacts_(payload.contacts);
    var authorization = payload.authorization || {};
    var tutorEmail = normalizeEmail_(payload.tutor_email);

    if (!student.id) return jsonOutput_({ ok: false, sent: 0, skipped: 0, errors: ['Missing student id.'] });

    if (target === 'student') {
      return jsonOutput_(sendPanelStudentInvite_(student, authorization, tutorEmail));
    }
    return jsonOutput_(sendPanelParentInvites_(student, contacts, authorization, tutorEmail));
  } catch (error) {
    return jsonOutput_({ ok: false, sent: 0, skipped: 0, errors: [safeErrorMessage_(error)] });
  }
}

function handlePanelPrintLink_(payload) {
  try {
    assertPanelSecret_(payload.secret);
    var student = normalizePanelStudent_(payload.student);
    var authorization = payload.authorization || {};
    var respostaId = stringValue_(authorization.resposta_id || payload.resposta_id);
    if (!student.id || !respostaId) return jsonOutput_({ ok: false, error: 'Missing student id or response id.' });
    var token = createVerificationToken_({
      sender: 'tutor_print',
      email: normalizeEmail_(payload.tutor_email),
      dinantia_account_id: '',
      student_id: student.id,
      resposta_id: respostaId,
      metadata: {
        source: 'tauler_tutor',
        tutor_email: normalizeEmail_(payload.tutor_email),
        student: student,
        form_payload: {
          form_mode: 'readonly_print',
          resposta_id: respostaId,
          id_student: student.id
        }
      }
    });
    return jsonOutput_({ ok: true, url: LAUNCHER_CONFIG.launcherUrl + '?token=' + encodeURIComponent(token.rawToken) });
  } catch (error) {
    return jsonOutput_({ ok: false, error: safeErrorMessage_(error) });
  }
}

function sendPanelParentInvites_(student, contacts, authorization, tutorEmail) {
  var summary = { ok: true, sent: 0, skipped: 0, errors: [] };
  var recipients = contacts || [];
  if (!recipients.length) {
    return { ok: false, sent: 0, skipped: 1, errors: ['No parent/contact recipients provided.'] };
  }

  recipients.forEach(function(contact) {
    var email = normalizeEmail_(contact.email);
    if (!isValidEmail_(email)) {
      summary.skipped++;
      return;
    }

    try {
      var token = createVerificationToken_({
        sender: 'parent',
        email: email,
        dinantia_account_id: contact.id || '',
        student_id: student.id,
        resposta_id: stringValue_(authorization && authorization.resposta_id),
        metadata: {
          source: 'tauler_tutor',
          tutor_email: tutorEmail,
          parent_name: contact.name || '',
          parent_phone: contact.phone || '',
          student: student
        }
      });
      sendVerificationEmail_(email, 'parent', token.rawToken, student);
      summary.sent++;
    } catch (error) {
      summary.errors.push('Parent invitation failed for ' + email + ': ' + safeErrorMessage_(error));
    }
  });

  summary.ok = summary.sent > 0 && summary.errors.length === 0;
  if (summary.sent > 0 && summary.errors.length > 0) summary.ok = true;
  return summary;
}

function sendPanelStudentInvite_(student, authorization, tutorEmail) {
  var email = normalizeEmail_(student.email);
  if (!isValidEmail_(email) || !/@iernestlluch\.cat$/i.test(email)) {
    return { ok: false, sent: 0, skipped: 1, errors: ['Student email is missing or invalid.'] };
  }

  var auth = findLatestAuthorizationByStudentId_(student.id);
  if (!auth && authorization && authorization.resposta_id) auth = { resposta_id: stringValue_(authorization.resposta_id) };
  var isAdult = stringValue_(student.isAdult).toLowerCase() === 'si' || Number(student.age) >= 18;
  var token = createVerificationToken_({
    sender: 'student',
    email: email,
    dinantia_account_id: student.id,
    student_id: student.id,
    resposta_id: auth ? stringValue_(auth.resposta_id) : '',
    metadata: {
      source: 'tauler_tutor',
      tutor_email: tutorEmail,
      student: student,
      auth: auth || null,
      isAdult: isAdult
    }
  });
  sendVerificationEmail_(email, isAdult ? 'student_adult' : 'student', token.rawToken, student);
  return { ok: true, sent: 1, skipped: 0, errors: [] };
}

function normalizePanelStudent_(student) {
  student = student || {};
  return {
    id: stringValue_(student.id || student.student_id),
    name: stringValue_(student.name || student.alumne_nom),
    email: normalizeEmail_(student.email || student.student_email),
    document: stringValue_(student.document || student.alumne_document),
    studyType: stringValue_(student.studyType),
    isAdult: stringValue_(student.isAdult),
    is14Plus: stringValue_(student.is14Plus),
    age: stringValue_(student.age),
    birthdateIso: stringValue_(student.birthdateIso)
  };
}

function normalizePanelContacts_(contacts) {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(function(contact) {
    return {
      id: stringValue_(contact && contact.id),
      name: stringValue_(contact && contact.name),
      email: normalizeEmail_(contact && contact.email),
      phone: stringValue_(contact && contact.phone)
    };
  });
}

function assertPanelSecret_(providedSecret) {
  var expected = getRequiredProperty_(LAUNCHER_CONFIG.internalSecretProperty);
  if (!stringValue_(providedSecret) || stringValue_(providedSecret) !== expected) {
    throw new Error('Invalid panel invitation credentials.');
  }
}

function handleParentVerification_(payload) {
  var email = normalizeEmail_(payload.email);
  if (!isValidEmail_(email)) return renderParentEntry_('Introdueix una adreca de correu electronic valida.');

  var parent = findDinantiaAccountByEmail_(email);
  if (!parent) return renderNotRegistered_();

  var children = findStudentsForParent_(parent.id);
  var availableChildren = children.map(function(child) {
    return enrichStudentForLauncher_(child);
  }).filter(function(child) {
    return Number(child.age) < 18;
  });
  if (!availableChildren.length) return renderNoMinorChildren_();

  var token = createVerificationToken_({
    sender: 'parent',
    email: email,
    dinantia_account_id: parent.id,
    student_id: '',
    resposta_id: '',
    metadata: { parent_name: parent.name || '', parent_phone: parent.phone || '', children: availableChildren }
  });
  sendVerificationEmail_(email, 'parent', token.rawToken, availableChildren.length === 1 ? availableChildren[0] : null);
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
  sendVerificationEmail_(email, isAdult ? 'student_adult' : 'student', token.rawToken, student);
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
    return renderParentStudentOutcome_(rawToken, child, metadata.auth || null);
  }
  if (record.sender === 'student') return renderStudentOutcome_(rawToken, metadata.student, metadata.auth, metadata.isAdult);
  if (record.sender === 'tutor_print') {
    var printPayload = metadata.form_payload || {
      form_mode: 'readonly_print',
      resposta_id: record.resposta_id,
      id_student: record.student_id
    };
    printPayload.launcher_token = rawToken;
    return renderAutoPostToForm_(printPayload);
  }
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
  return renderParentStudentOutcome_(rawToken, child, metadata.auth || null);
}

function renderParentStudentOutcome_(rawToken, child, existingAuth) {
  var detailed = enrichStudentForLauncher_(child);
  var auth = existingAuth || findLatestAuthorizationByStudentId_(detailed.id);
  if (Number(detailed.age) >= 18) {
    return renderMessagePage_('Alumne/a major d edat', 'Aquest formulari ha de ser emplenat pel mateix alumne/a perquè es major d edat. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.', false);
  }
  if (auth) {
    var record = validateToken_(rawToken, { allowPendingOnly: true });
    var owner = codeKey_(auth.submitted_by_dinantia_account_id) && codeKey_(auth.submitted_by_dinantia_account_id) === codeKey_(record.dinantia_account_id);
    return renderFormAccessMessage_(rawToken, formPayloadForExistingAuthorization_(auth, detailed, owner ? 'edit_owner' : 'readonly', record, rawToken), owner ? 'Formulari ja emplenat' : 'Aquest formulari ja consta com a emplenat.', owner ? 'Ja existeix una resposta per aquest alumne/a. Com que coincideix amb la persona que la va emplenar, pots revisar-la i desar canvis sobre la mateixa resposta.' : 'Podeu consultar-ne la informacio en mode nomes lectura. Si detecteu alguna errada o voleu fer qualsevol consulta o reclamacio, poseu-vos en contacte amb el centre.', owner ? 'EDITAR EL FORMULARI' : 'VEURE EL FORMULARI');
  }
  var payload = formPayloadFromStudent_(detailed);
  payload.form_mode = 'new_parent';
  payload.verified_actor_type = 'parent';
  var parentRecord = validateToken_(rawToken, { allowPendingOnly: true });
  payload.verified_dinantia_account_id = parentRecord.dinantia_account_id || '';
  payload.verified_email = parentRecord.email || '';
  var metadata = parseJson_(parentRecord.metadata_json) || {};
  payload.responent_nom_sencer = metadata.parent_name || '';
  payload.responent_telefon = metadata.parent_phone || '';
  payload.responsable_nom = metadata.parent_name || '';
  return renderFamilyMessage_(rawToken, payload);
}

function renderStudentOutcome_(rawToken, student, auth, isAdult) {
  if (isAdult && !auth) {
    var adultPayload = formPayloadFromStudent_(student);
    var adultRecord = validateToken_(rawToken, { allowPendingOnly: true });
    adultPayload.form_mode = 'new_student_adult';
    adultPayload.verified_actor_type = 'student';
    adultPayload.verified_dinantia_account_id = adultRecord.dinantia_account_id || adultRecord.student_id || '';
    adultPayload.verified_email = adultRecord.email || '';
    return renderAdultStudentMessage_(rawToken, adultPayload);
  }
  if (!auth) return renderStudentNeedsParent_();
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  var mode = parseBooleanValue_(auth.signatura_alumne) === true ? 'readonly' : 'student_confirm';
  var title = mode === 'student_confirm' ? 'Confirma el formulari' : 'Confirmacio ja registrada';
  var message = mode === 'student_confirm' ? 'Revisa la informacio en mode nomes lectura i confirma la teva conformitat.' : 'La teva confirmacio ja consta registrada.';
  return renderFormAccessMessage_(rawToken, formPayloadForExistingAuthorization_(auth, student, mode, record, rawToken), title, message, mode === 'student_confirm' ? 'REVISAR I CONFIRMAR' : 'VEURE EL FORMULARI');
}

function handleForwardForm_(payload) {
  var rawToken = stringValue_(payload.token);
  validateToken_(rawToken, { allowPendingOnly: true });
  var formPayload = parseJson_(payload.form_payload_json) || {};
  return renderAutoPostToForm_(formPayload);
}

function handleStudentConfirmation_(payload) {
  var rawToken = stringValue_(payload.token);
  var respostaId = stringValue_(payload.resposta_id);
  var record = validateToken_(rawToken, { allowPendingOnly: true });
  if (record.sender !== 'student') return renderMessagePage_('No s ha pogut confirmar', 'Aquest enllac no correspon a una confirmacio d alumne.', true);
  updateStudentSignature_(record.student_id, respostaId, record.email);
  refreshAuthorizationsCache_();
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
    '<p>Aquest acces esta pensat per a l alumnat del centre. Si ets major d edat, podras emplenar directament el formulari d autoritzacions, declaracions i comunicacions. Si tens 14 anys o mes i la teva familia ja ha emplenat el formulari, podras revisar-lo i confirmar la teva conformitat.</p>' +
    '<p>Per aquest motiu, abans d accedir al formulari es necessari verificar la teva identitat.</p>' +
    '<p>Per comencar, introdueix la teva adreca de correu electronic i selecciona el curs o grup al qual pertanys aquest curs escolar. Amb aquesta informacio podrem localitzar el teu expedient i obrir el proces que correspongui en el teu cas.</p>' +
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

function renderNoMinorChildren_() {
  return renderMessagePage_('Cap alumne/a menor d edat disponible', 'No consta cap alumne/a menor de divuit anys associat a aquesta adreca. En cas d alumnat major d edat, el formulari l ha d emplenar directament l alumne/a. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.', true);
}

function renderCheckEmail_() {
  return renderMessagePage_('Revisa el correu electronic', 'Si l adreca indicada correspon a una persona autoritzada, rebreu un correu electronic amb l enllac de verificacio.', false);
}

function renderFamilyMessage_(token, payload) {
  payload = Object.assign({}, payload || {}, { launcher_token: token });
  var formPayloadJson = JSON.stringify(payload || {});
  var body = '<p>Benvolguda familia,</p><p>Per tal d iniciar correctament el curs escolar i mantenir actualitzada la informacio de l alumnat, us demanem que empleneu el formulari d autoritzacions, declaracions i comunicacions corresponent al vostre fill o filla.</p><p>En aquest formulari podreu:</p><ul><li>revisar i actualitzar les dades basiques;</li><li>autoritzar les diferents activitats i serveis del centre;</li><li>indicar persones autoritzades per recollir l alumne/a;</li><li>facilitar la informacio sanitaria rellevant;</li><li>signar electronicament les autoritzacions.</li></ul><p>Per accedir al formulari, feu clic al seguent boto:</p><form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="forward_form"><input type="hidden" name="token" value="' + escapeHtml_(token) + '"><input type="hidden" name="form_payload_json" value="' + escapeHtml_(formPayloadJson) + '"><button class="button" type="submit">EMPLENAR EL FORMULARI</button></form><p>Temps aproximat: 10 minuts.</p><p>Es important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informacio sera utilitzada durant tot el curs escolar.</p><p>Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d acord amb la normativa vigent en materia de proteccio de dades personals.</p><p>Si teniu qualsevol incidencia tecnica o dubte sobre el formulari, podeu contactar amb el centre a traves del correu:</p><p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p><p>Moltes gracies per la vostra col·laboracio.</p><p>Cordialment,</p><p>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>';
  return htmlPage_('Formulari d autoritzacions', body);
}

function renderAdultStudentMessage_(token, payload) {
  payload = Object.assign({}, payload || {}, { launcher_token: token });
  var formPayloadJson = JSON.stringify(payload || {});
  var studentName = payload.alumne_nom || '';
  var body = '<p>Benvolgut/da' + (studentName ? ' ' + escapeHtml_(studentName) : '') + ',</p>' +
    '<p>Com que ets major d edat, el formulari d autoritzacions, declaracions i comunicacions del centre ha de ser emplenat i signat directament per tu.</p>' +
    '<p>En aquest formulari podràs revisar les teves dades bàsiques, autoritzar les activitats i serveis del centre, facilitar la informació sanitària rellevant i signar electrònicament les autoritzacions necessàries per al curs escolar.</p>' +
    '<p>Per accedir-hi, fes clic al botó següent:</p>' +
    '<form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="forward_form"><input type="hidden" name="token" value="' + escapeHtml_(token) + '"><input type="hidden" name="form_payload_json" value="' + escapeHtml_(formPayloadJson) + '"><button class="button" type="submit">EMPLENAR EL FORMULARI</button></form>' +
    '<p>Aquest enllaç és personal i caduca en 24 hores.</p>' +
    '<p>Temps aproximat: 10 minuts.</p>' +
    '<p>Es important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informacio sera utilitzada durant tot el curs escolar.</p>' +
    '<p>Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d acord amb la normativa vigent en materia de proteccio de dades personals.</p>' +
    '<p>Si tens qualsevol incidència tècnica o dubte sobre el formulari, pots contactar amb el centre a través del correu:</p>' +
    '<p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p>' +
    '<p>Moltes gracies per la teva col·laboracio.</p>' +
    '<p>Cordialment,<br>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>';
  return htmlPage_('Formulari d autoritzacions', body);
}

function renderFormAccessMessage_(token, payload, title, message, buttonText) {
  var formPayloadJson = JSON.stringify(payload || {});
  var body = '<h1>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p><form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="forward_form"><input type="hidden" name="token" value="' + escapeHtml_(token) + '"><input type="hidden" name="form_payload_json" value="' + escapeHtml_(formPayloadJson) + '"><button class="button" type="submit">' + escapeHtml_(buttonText || 'OBRIR EL FORMULARI') + '</button></form>';
  return htmlPage_(title, body);
}

function renderReadonlyAuthorization_(auth, title, message, studentAction, token) {
  var sections = readonlyAuthorizationSections_().map(function(section) {
    var rows = section.fields.map(function(field) {
      var value = auth ? auth[field.key] : '';
      if (value === '' || value === null || value === undefined) return '';
      return '<tr><th>' + escapeHtml_(field.label) + '</th><td>' + escapeHtml_(formatReadonlyValue_(value)) + '</td></tr>';
    }).filter(Boolean).join('');
    return rows ? '<h2>' + escapeHtml_(section.title) + '</h2><div class="table-wrap"><table>' + rows + '</table></div>' : '';
  }).filter(Boolean).join('');
  var action = '';
  if (studentAction) {
    action = '<form method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.launcherUrl) + '"><input type="hidden" name="action" value="confirm_student"><input type="hidden" name="token" value="' + escapeHtml_(studentAction.token) + '"><input type="hidden" name="resposta_id" value="' + escapeHtml_(studentAction.resposta_id) + '"><button class="button" type="submit">Confirmo</button></form>';
  }
  return htmlPage_(title, '<h1>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p>' + sections + action);
}

function readonlyAuthorizationSections_() {
  return [
    { title: 'Dades generals', fields: [
      { key: 'resposta_id', label: 'Resposta' },
      { key: 'data_hora_enviament', label: 'Data d enviament' },
      { key: 'data_signatura', label: 'Data de signatura' },
      { key: 'codi_document', label: 'Codi del document' },
      { key: 'tipus_alumne', label: 'Tipus d alumne/a' },
      { key: 'alumne_nom', label: 'Alumne/a' },
      { key: 'alumne_document', label: 'Document' }
    ] },
    { title: 'Persona que respon', fields: [
      { key: 'responent_nom_sencer', label: 'Nom sencer' },
      { key: 'responent_telefon', label: 'Telefon' },
      { key: 'responsable_nom', label: 'Nom del responsable' },
      { key: 'responsable_document', label: 'Document del responsable' }
    ] },
    { title: 'Autoritzacions', fields: [
      { key: 'sortida_sola', label: 'Sortida sola' },
      { key: 'sortida_esbarjo', label: 'Sortida a l esbarjo' },
      { key: 'sortides_municipi', label: 'Sortides pel municipi' },
      { key: 'comunicacio_academica', label: 'Comunicacio academica' },
      { key: 'comunicacio_salut', label: 'Comunicacio de salut' },
      { key: 'declaracio_plataformes', label: 'Declaracio de plataformes' }
    ] },
    { title: 'Imatge i obres', fields: [
      { key: 'plataformes_externes', label: 'Plataformes externes' },
      { key: 'imatge_intranet', label: 'Imatge a intranet' },
      { key: 'imatge_web', label: 'Imatge al web' },
      { key: 'imatge_externa', label: 'Imatge externa' },
      { key: 'obra_oberta', label: 'Obra oberta' },
      { key: 'obra_centre', label: 'Obra del centre' },
      { key: 'obra_biblioteca', label: 'Obra a biblioteca' },
      { key: 'obra_repositori', label: 'Obra a repositori' }
    ] },
    { title: 'Salut i contactes', fields: [
      { key: 'acad_contacte_nom', label: 'Contacte academic' },
      { key: 'acad_contacte_email', label: 'Email academic' },
      { key: 'acad_contacte_relacio', label: 'Relacio academica' },
      { key: 'emergencia_nom', label: 'Contacte d emergencia' },
      { key: 'emergencia_telefon', label: 'Telefon d emergencia' },
      { key: 'emergencia_relacio', label: 'Relacio d emergencia' },
      { key: 'problemes_salut', label: 'Problemes de salut' },
      { key: 'altres_salut', label: 'Altres dades de salut' },
      { key: 'medicacio', label: 'Medicacio' },
      { key: 'posologia', label: 'Posologia' },
      { key: 'dosi', label: 'Dosi' },
      { key: 'administracio_medicacio', label: 'Administracio de medicacio' },
      { key: 'paracetamol', label: 'Paracetamol' }
    ] },
    { title: 'Signatures', fields: [
      { key: 'lloc', label: 'Lloc' },
      { key: 'signatura_responsable', label: 'Signatura responsable' },
      { key: 'signatura_alumne', label: 'Signatura alumne/a' }
    ] }
  ];
}

function renderAutoPostToForm_(payload) {
  var inputs = Object.keys(payload || {}).map(function(key) {
    return '<input type="hidden" name="' + escapeHtml_(key) + '" value="' + escapeHtml_(payload[key]) + '">';
  }).join('');
  var html = '<!doctype html><html lang="ca"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Obrint el formulari</title><style>body{margin:0;background:#f6f7f9;color:#17202a;font-family:Arial,sans-serif;line-height:1.5}main{width:min(680px,calc(100% - 32px));margin:32px auto;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:30px;box-shadow:0 16px 40px rgba(21,34,50,.10)}h1{font-size:26px;line-height:1.2;margin:0 0 12px}.button{display:inline-block;border:0;border-radius:6px;background:#0f766e;color:#fff;cursor:pointer;font-size:16px;font-weight:800;padding:13px 18px;text-decoration:none}.note{color:#617080}.loading-row{display:flex;gap:12px;align-items:center;margin:16px 0}.spinner{width:24px;height:24px;border:3px solid #d9e0e8;border-top-color:#0f766e;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><main><h1>Obrint el formulari...</h1><div class="loading-row"><div class="spinner" aria-hidden="true"></div><p>Carregant el formulari.</p></div><p class="note">Si el formulari no s obre automaticament, prem el boto.</p><form id="forwardForm" method="post" action="' + escapeHtml_(LAUNCHER_CONFIG.authFormUrl) + '">' + inputs + '<button class="button" type="submit">Obrir formulari</button></form></main><script>(function(){var form=document.getElementById("forwardForm");if(!form)return;setTimeout(function(){try{form.submit();}catch(error){}},250);})();</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Obrint el formulari')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderMessagePage_(title, message, isError) {
  return htmlPage_(title, '<h1' + (isError ? ' class="danger"' : '') + '>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p>');
}

function renderLauncherError_(error) {
  var message = safeErrorMessage_(error);
  if (/already used/i.test(message)) {
    return renderMessagePage_('Enllaç ja utilitzat', 'Aquest enllaç ja s ha utilitzat. Si necessiteu tornar a accedir al formulari, torneu a iniciar el procés o demaneu un nou enllaç al centre.', true);
  }
  if (/expired/i.test(message)) {
    return renderMessagePage_('Enllaç caducat', 'Aquest enllaç ha caducat. Torneu a iniciar el procés per rebre un nou enllaç. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.', true);
  }
  return renderMessagePage_('No s ha pogut continuar', 'S ha produït un error. Si el problema continua, poseu-vos en contacte amb el centre.', true);
}

function renderTokenLoadingPage_(rawToken) {
  var html = '<!doctype html><html lang="ca"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carregant</title><style>body{margin:0;background:#f6f7f9;color:#17202a;font-family:Arial,sans-serif}.loading-screen{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#f6f7f9}.loading-card{display:flex;flex-direction:column;align-items:center;gap:14px;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:26px 34px;box-shadow:0 16px 40px rgba(21,34,50,.12);font-weight:800;text-align:center}.loading-spinner{width:42px;height:42px;border:4px solid #d9e0e8;border-top-color:#0f766e;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.loading-note{color:#617080;font-size:14px;font-weight:400}.error-card{width:min(760px,calc(100% - 32px));margin:36px auto;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:30px;font-family:Arial,sans-serif}.error-card h1{color:#b42318}</style></head><body><div class="loading-screen" role="status" aria-live="polite" aria-busy="true"><div class="loading-card"><div class="loading-spinner" aria-hidden="true"></div><div>Carregant</div><div class="loading-note">Preparant el formulari...</div></div></div><script>(function(){var finished=false;function showError(title,message){if(finished)return;finished=true;document.body.innerHTML="<main class=\\"error-card\\"><h1>"+title+"</h1><p>"+message+"</p></main>";}var timeout=setTimeout(function(){showError("No s ha pogut continuar","El formulari esta trigant massa a carregar-se. Torneu-ho a provar d aqui a uns instants i, si el problema continua, poseu-vos en contacte amb el centre.");},60000);google.script.run.withSuccessHandler(function(html){if(finished)return;finished=true;clearTimeout(timeout);document.open();document.write(html);document.close();}).withFailureHandler(function(error){clearTimeout(timeout);showError("No s ha pogut continuar","S ha produït un error. Si el problema continua, poseu-vos en contacte amb el centre.");}).resolveTokenHtml(' + JSON.stringify(String(rawToken || '')) + ');})();</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Carregant')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function htmlPage_(title, body) {
  return HtmlService.createHtmlOutput('<!doctype html><html lang="ca"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml_(title) + '</title><style>body{margin:0;background:#f6f7f9;color:#17202a;font-family:Arial,sans-serif;line-height:1.5}main{width:min(820px,calc(100% - 32px));margin:32px auto;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:30px;box-shadow:0 16px 40px rgba(21,34,50,.10)}h1{font-size:28px;line-height:1.2;margin:0 0 18px}h2{font-size:18px;margin-top:28px}.danger{color:#b42318}.alert{border:1px solid #f0b4b4;background:#fff1f1;color:#b42318;border-radius:6px;padding:10px 12px;margin-bottom:18px}label{display:block;font-weight:700;margin:18px 0}label span{display:block;color:#617080;font-size:14px;font-weight:400;margin:4px 0 8px}input,select{width:100%;border:1px solid #ccd6e0;border-radius:6px;font:inherit;padding:11px 12px}.button{display:inline-block;border:0;border-radius:6px;background:#0f766e;color:#fff;cursor:pointer;font-size:16px;font-weight:800;padding:13px 18px;text-decoration:none}.button.secondary{background:#344354}.actions{display:flex;gap:12px;flex-wrap:wrap}.small{color:#617080;font-size:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d9e0e8;padding:9px 10px;text-align:left;vertical-align:top}th{width:230px;background:#edf1f5}.loading-screen{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#f6f7f9;color:#17202a;transition:opacity .18s ease,visibility .18s ease}.loading-card{display:flex;flex-direction:column;align-items:center;gap:14px;background:#fff;border:1px solid #d9e0e8;border-radius:8px;padding:26px 34px;box-shadow:0 16px 40px rgba(21,34,50,.12);font-weight:800}.loading-spinner{width:42px;height:42px;border:4px solid #d9e0e8;border-top-color:#0f766e;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}body:not(.is-loading) .loading-screen{opacity:0;visibility:hidden;pointer-events:none}</style><script>document.documentElement.classList.add("js");function showLauncherLoading(){document.body&&document.body.classList.add("is-loading")}function hideLauncherLoading(){document.body&&document.body.classList.remove("is-loading")}window.addEventListener("pageshow",function(){setTimeout(hideLauncherLoading,180)});window.addEventListener("load",function(){setTimeout(hideLauncherLoading,180)});document.addEventListener("DOMContentLoaded",function(){setTimeout(hideLauncherLoading,180)});document.addEventListener("submit",function(){showLauncherLoading()},true);document.addEventListener("click",function(event){var link=event.target&&event.target.closest?event.target.closest("a.button"):null;if(link&&link.href)showLauncherLoading()},true);</script></head><body class="is-loading"><div class="loading-screen" role="status" aria-live="polite" aria-busy="true"><div class="loading-card"><div class="loading-spinner" aria-hidden="true"></div><div>Carregant</div></div></div><main>' + body + '</main></body></html>')
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
  var sheet = openTableSheet_('Dinantia', 'dinantia_2_dades_alumnes');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var groups = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var name = stringValue_(row[h.dinantia_group_name]);
    var localSheet = stringValue_(row[h.dades_alumnes_sheet]);
    if (name && localSheet) groups.push({ dinantia_group_name: name, dades_alumnes_sheet: localSheet });
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
  var name = localStudentFullName_(row, h);
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

function localStudentFullName_(row, h) {
  var composed = ['Nom', 'Cognom1', 'Cognom2'].map(function(header) {
    return h[header] !== undefined ? stringValue_(row[h[header]]) : '';
  }).filter(Boolean).join(' ');
  if (composed) return composed;
  return firstExisting_(row, h, ['Nom complet', 'NOM_COMPLET', 'Alumne', 'Nom i cognoms', 'Cognoms, Nom', 'Nom']);
}

function firstExisting_(row, h, headers) {
  for (var i = 0; i < headers.length; i++) if (h[headers[i]] !== undefined) return stringValue_(row[h[headers[i]]]);
  return '';
}

function enrichStudentForLauncher_(student) {
  student = student || {};
  var normalized = normalizePanelStudent_(student);
  if (normalized.id && (normalized.age || normalized.birthdateIso || normalized.isAdult) && (normalized.studyType || normalized.document || normalized.is14Plus)) {
    var age = normalized.age !== '' ? Number(normalized.age) : '';
    var isAdult = normalized.isAdult || (age !== '' && age >= 18 ? 'si' : 'no');
    var is14Plus = normalized.is14Plus || (age !== '' && age >= 14 ? 'si' : 'no');
    return {
      id: normalized.id,
      name: normalized.name || student.name || '',
      birthdateIso: normalized.birthdateIso || '',
      age: normalized.age,
      document: normalized.document || '',
      studyType: normalized.studyType || inferStudyType_(student.group_name || student.groupName || student.name || ''),
      isAdult: isAdult,
      is14Plus: is14Plus
    };
  }
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

function findDinantiaAccountById_(accountId) {
  if (!accountId) return null;
  var body = fetchDinantiaJson_('/v1.2/accounts/view/' + encodeURIComponent(accountId));
  return body.data || null;
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
    if (parseBooleanValue_(auth.invalidated) === true) continue;
    auth._rowNumber = i + 1;
    if (!latest || stringValue_(auth.data_hora_enviament) >= stringValue_(latest.data_hora_enviament)) latest = auth;
  }
  return latest;
}

function updateStudentSignature_(studentId, respostaId, confirmedEmail) {
  var sheet = openTableSheet_('Autoritzacions', 'autoritzacions');
  var h = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (codeKey_(row[h.id_student]) === codeKey_(studentId) && (!respostaId || stringValue_(row[h.resposta_id]) === respostaId)) {
      sheet.getRange(i + 1, h.signatura_alumne + 1).setValue(true);
      if (h.student_confirmed_at !== undefined) sheet.getRange(i + 1, h.student_confirmed_at + 1).setValue(formatDateTime_(new Date()));
      if (h.student_confirmed_email !== undefined) sheet.getRange(i + 1, h.student_confirmed_email + 1).setValue(normalizeEmail_(confirmedEmail));
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
  expireOldPendingTokens_();
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
  for (var i = values.length - 1; i >= 1; i--) {
    var row = values[i];
    if (stringValue_(row[h.token_hash]) !== hash) continue;
    var record = objectFromRow_(row, h);
    record._rowNumber = i + 1;
    if (record.status === 'revoked') throw new Error('Token revoked.');
    if (record.status === 'used' && options && options.allowPendingOnly) throw new Error('Token already used.');
    if (new Date(record.expires_at).getTime() < new Date().getTime()) {
      markTokenExpired_(sheet, h, record._rowNumber);
      throw new Error('Token expired.');
    }
    return record;
  }
  throw new Error('Token not found.');
}

function expireOldPendingTokens_() {
  var sheet = openTableSheet_('Autoritzacions', 'verification_tokens');
  var h = headerMap_(sheet);
  if (h.status === undefined || h.expires_at === undefined) return;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  var now = new Date().getTime();
  var statuses = sheet.getRange(2, h.status + 1, values.length - 1, 1).getValues();
  var changed = false;
  for (var i = 1; i < values.length; i++) {
    var status = stringValue_(values[i][h.status]);
    var expiresAt = new Date(values[i][h.expires_at]).getTime();
    if (status === 'pending' && expiresAt && expiresAt < now) {
      statuses[i - 1][0] = 'expired';
      changed = true;
    }
  }
  if (changed) sheet.getRange(2, h.status + 1, statuses.length, 1).setValues(statuses);
}

function markTokenExpired_(sheet, h, rowNumber) {
  sheet.getRange(rowNumber, h.status + 1).setValue('expired');
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

function sendVerificationEmail_(email, sender, rawToken, student) {
  var url = LAUNCHER_CONFIG.launcherUrl + '?token=' + encodeURIComponent(rawToken);
  var studentName = student && student.name ? student.name : '';
  var suffix = studentName ? ' - ' + studentName : '';
  var lifetime = '24 hores';
  var subject = sender === 'student' ? 'Enllac de confirmacio del formulari d autoritzacions' + suffix : sender === 'student_adult' ? 'Formulari d autoritzacions' + suffix : 'Formulari d autoritzacions' + suffix;
  var plain = sender === 'student'
    ? 'Benvolgut/da,\n\nPer revisar el formulari d autoritzacions' + (studentName ? ' de ' + studentName : '') + ' i confirmar la teva conformitat, obre aquest enllac personal i segur:\n\n' + url + '\n\nAquest enllac caduca en ' + lifetime + '.\n\nInstitut Ernest Lluch'
    : sender === 'student_adult'
    ? 'Benvolgut/da,\n\nPer tal d iniciar correctament el curs escolar i mantenir actualitzada la teva informacio, et demanem que emplenis el teu formulari d autoritzacions, declaracions i comunicacions.\n\nEn aquest formulari podràs revisar les teves dades bàsiques, autoritzar les activitats i serveis del centre, facilitar la informació sanitària rellevant i signar electrònicament les autoritzacions necessàries per al curs escolar.\n\nPer accedir-hi, fes clic al botó següent:\n\n' + url + '\n\nAquest enllaç és personal i caduca en ' + lifetime + '.\n\nTemps aproximat: 10 minuts.\n\nSi tens qualsevol incidència tècnica o dubte sobre el formulari, pots contactar amb el centre a través del correu:\n\n' + LAUNCHER_CONFIG.supportEmail + '\n\nCordialment,\n\nEquip Directiu\nInstitut Ernest Lluch\nCunit'
    : 'Benvolgut/da,\n\nPer continuar el proces d autoritzacions' + (studentName ? ' de ' + studentName : '') + ', obre aquest enllac personal i segur:\n\n' + url + '\n\nAquest enllac caduca en ' + lifetime + '.\n\nInstitut Ernest Lluch';
  var html = sender === 'student' ? studentVerificationEmailHtml_(url, student) : sender === 'student_adult' ? adultStudentVerificationEmailHtml_(url, student) : '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a;max-width:720px">' +
    '<p>Benvolguda familia,</p>' +
    '<p>Per tal d iniciar correctament el curs escolar i mantenir actualitzada la informacio de l alumnat, us demanem que empleneu el formulari d autoritzacions, declaracions i comunicacions' + (studentName ? ' corresponent a <strong>' + escapeHtml_(studentName) + '</strong>' : ' corresponent al vostre fill o filla') + '.</p>' +
    '<p>En aquest formulari podreu:</p>' +
    '<ul><li>revisar i actualitzar les dades basiques;</li><li>autoritzar les diferents activitats i serveis del centre;</li><li>indicar persones autoritzades per recollir l alumne/a;</li><li>facilitar la informacio sanitaria rellevant;</li><li>signar electronicament les autoritzacions.</li></ul>' +
    '<p>Per accedir al formulari, feu clic al seguent boto:</p>' +
    '<p><a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;padding:13px 18px;font-weight:800">EMPLENAR EL FORMULARI</a></p>' +
    '<p>Aquest enllac es personal i caduca en ' + lifetime + '.</p>' +
    '<p>Temps aproximat: 10 minuts.</p>' +
    '<p>Es important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informacio sera utilitzada durant tot el curs escolar.</p>' +
    '<p>Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d acord amb la normativa vigent en materia de proteccio de dades personals.</p>' +
    '<p>Si teniu qualsevol incidencia tecnica o dubte sobre el formulari, podeu contactar amb el centre a traves del correu:</p>' +
    '<p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p>' +
    '<p>Moltes gracies per la vostra col·laboracio.</p>' +
    '<p>Cordialment,<br>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>' +
    '</div>';
  MailApp.sendEmail({ to: email, subject: subject, body: plain, htmlBody: html, name: LAUNCHER_CONFIG.senderDisplayName });
}

function adultStudentVerificationEmailHtml_(url, student) {
  var studentName = student && student.name ? student.name : '';
  return '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a;max-width:720px">' +
    '<p>Benvolgut/da,</p>' +
    '<p>Per tal d iniciar correctament el curs escolar i mantenir actualitzada la teva informacio, et demanem que emplenis el teu formulari d autoritzacions, declaracions i comunicacions.</p>' +
    '<p>En aquest formulari podràs revisar les teves dades bàsiques, autoritzar les activitats i serveis del centre, facilitar la informació sanitària rellevant i signar electrònicament les autoritzacions necessàries per al curs escolar.</p>' +
    '<p>Per accedir-hi, fes clic al botó següent:</p>' +
    '<p><a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;padding:13px 18px;font-weight:800">EMPLENAR EL FORMULARI</a></p>' +
    '<p>Aquest enllaç és personal i caduca en 24 hores.</p>' +
    '<p>Temps aproximat: 10 minuts.</p>' +
    '<p>Si tens qualsevol incidència tècnica o dubte sobre el formulari, pots contactar amb el centre a través del correu:</p>' +
    '<p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p>' +
    '<p>Cordialment,<br>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>' +
    '</div>';
}

function studentVerificationEmailHtml_(url, student) {
  var studentName = student && student.name ? student.name : '';
  return '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a;max-width:720px">' +
    '<p>Benvolgut/da,</p>' +
    '<p>Algunes autoritzacions i declaracions del curs' + (studentName ? ' de <strong>' + escapeHtml_(studentName) + '</strong>' : '') + ' requereixen tambe la conformitat de l alumnat.</p>' +
    '<p>Per revisar el formulari ja emplenat i confirmar la teva conformitat, fes clic al boto seguent:</p>' +
    '<p><a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;padding:13px 18px;font-weight:800">REVISAR I CONFIRMAR</a></p>' +
    '<p>Aquest enllac es personal i caduca en 24 hores.</p>' +
    '<p>Si tens qualsevol incidencia tecnica o dubte sobre el formulari, pots contactar amb el centre a traves del correu:</p>' +
    '<p><strong>' + escapeHtml_(LAUNCHER_CONFIG.supportEmail) + '</strong></p>' +
    '<p>Cordialment,<br>Equip Directiu<br>Institut Ernest Lluch<br>Cunit</p>' +
    '</div>';
}

function formPayloadFromStudent_(student) {
  return { id_student: student.id || '', alumne_nom: student.name || '', alumne_document: student.document || '', studyType: student.studyType || '', isAdult: student.isAdult || '', is14Plus: student.is14Plus || '' };
}

function formPayloadForExistingAuthorization_(auth, student, mode, record, rawToken) {
  return {
    form_mode: mode,
    resposta_id: auth.resposta_id || record.resposta_id || '',
    id_student: auth.id_student || student.id || record.student_id || '',
    verified_actor_type: record.sender === 'student' ? 'student' : 'parent',
    verified_dinantia_account_id: record.dinantia_account_id || '',
    verified_email: record.email || '',
    launcher_token: rawToken
  };
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
function formatReadonlyValue_(value) {
  var parsed = parseBooleanValue_(value);
  if (parsed === true) return 'Si';
  if (parsed === false) return 'No';
  return formatValue_(value);
}
function jsonOutput_(object) { return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON); }

function refreshAuthorizationsCache_() {
  var cacheSheet = openTableSheet_('Dinantia', 'authorizations_cache');
  var cacheHeaders = headerMap_(cacheSheet);
  var rows = buildAuthorizationsCacheRows_();
  overwriteByHeaders_(cacheSheet, cacheHeaders, rows);
}

function buildAuthorizationsCacheRows_() {
  var authSheet = openTableSheet_('Autoritzacions', 'autoritzacions');
  var tokensSheet = openTableSheet_('Autoritzacions', 'verification_tokens');
  var authHeaders = headerMap_(authSheet);
  var tokenHeaders = headerMap_(tokensSheet);
  var authorizations = objectsFromSheet_(authSheet, authHeaders);
  var tokens = objectsFromSheet_(tokensSheet, tokenHeaders);
  var latestAuth = {};
  var latestToken = {};

  authorizations.forEach(function(auth) {
    var id = stringValue_(auth.id_student);
    if (!id) return;
    if (parseBooleanValue_(auth.invalidated) === true) return;
    if (!latestAuth[id] || stringValue_(auth.data_hora_enviament) >= stringValue_(latestAuth[id].data_hora_enviament)) latestAuth[id] = auth;
  });
  tokens.forEach(function(token) {
    var id = stringValue_(token.student_id);
    if (!id) return;
    if (!latestToken[id] || stringValue_(token.created_at) >= stringValue_(latestToken[id].created_at)) latestToken[id] = token;
  });

  var ids = {};
  Object.keys(latestAuth).forEach(function(id) { ids[id] = true; });
  Object.keys(latestToken).forEach(function(id) { ids[id] = true; });
  return Object.keys(ids).map(function(studentId) {
    var out = {};
    var auth = latestAuth[studentId] || {};
    var token = latestToken[studentId] || {};
    Object.keys(auth).forEach(function(key) { out[key] = auth[key]; });
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

function objectsFromSheet_(sheet, h) {
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) rows.push(objectFromRow_(values[i], h));
  return rows;
}

function overwriteByHeaders_(sheet, h, objects) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  if (!objects.length) return;
  var headers = Object.keys(h);
  var width = sheet.getLastColumn();
  var rows = objects.map(function(object) {
    var row = new Array(width).fill('');
    headers.forEach(function(header) {
      row[h[header]] = object[header] === undefined ? '' : object[header];
    });
    return row;
  });
  sheet.getRange(2, 1, rows.length, width).setValues(rows);
}


function authorizeServices() {
  getRegistry_();
  getClassGroups_();
  MailApp.getRemainingDailyQuota();
  PropertiesService.getScriptProperties().getProperties();
  return 'Authorization OK';
}
