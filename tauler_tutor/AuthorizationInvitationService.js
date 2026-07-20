function sendAuthorizationInvitations_(requests) {
  var normalized = normalizeInvitationRequests_(requests);
  if (!normalized.length) {
    return { ok: true, sent: 0, skipped: 0, errors: ['No hi ha cap invitacio pendent per enviar.'] };
  }

  var secret = getRequiredScriptProperty_(SCRIPT_PROPERTIES.launcherInternalSecret);
  var tutorEmail = getCurrentUserEmail_();
  var totals = { ok: true, sent: 0, skipped: 0, errors: [] };

  normalized.forEach(function(request) {
    try {
      var result = callLauncherPanelInvite_(request, tutorEmail, secret);
      totals.sent += Number(result.sent || 0);
      totals.skipped += Number(result.skipped || 0);
      (result.errors || []).forEach(function(error) {
        totals.errors.push(error);
      });
    } catch (error) {
      totals.errors.push(safeInvitationError_(request, error));
    }
  });

  totals.ok = totals.sent > 0 && totals.errors.length === 0;
  if (totals.sent > 0 && totals.errors.length > 0) {
    totals.ok = true;
  }
  if (totals.sent > 0) {
    refreshAuthorizationsCache_();
  }
  return totals;
}

function createAuthorizationPrintLink_(request) {
  request = request || {};
  var secret = getRequiredScriptProperty_(SCRIPT_PROPERTIES.launcherInternalSecret);
  var tutorEmail = getCurrentUserEmail_();
  var normalized = {
    student: sanitizeInvitationStudent_(request.student),
    authorization: sanitizeInvitationAuthorization_(request.authorization)
  };
  if (!normalized.student.id || !normalized.authorization.resposta_id) {
    throw new AppError('No es pot obrir el formulari: falten dades de l alumne/a o de la resposta.', {
      code: 'AUTH_PRINT_LINK_MISSING_DATA'
    });
  }
  return callLauncherPrintLink_(normalized, tutorEmail, secret);
}

function normalizeInvitationRequests_(requests) {
  if (!Array.isArray(requests)) return [];
  return requests.map(function(request) {
    var target = String(request && request.target || '').trim();
    return {
      target: target === 'student' ? 'student' : 'parents',
      student: sanitizeInvitationStudent_(request && request.student),
      contacts: sanitizeInvitationContacts_(request && request.contacts),
      authorization: sanitizeInvitationAuthorization_(request && request.authorization)
    };
  }).filter(function(request) {
    return request.student.id;
  });
}

function sanitizeInvitationStudent_(student) {
  student = student || {};
  return {
    id: String(student.id || '').trim(),
    name: String(student.name || '').trim(),
    email: String(student.email || '').trim().toLowerCase(),
    document: String(student.document || '').trim(),
    studyType: String(student.studyType || '').trim(),
    isAdult: String(student.isAdult || '').trim(),
    is14Plus: String(student.is14Plus || '').trim(),
    age: String(student.age || '').trim(),
    birthdateIso: String(student.birthdateIso || '').trim()
  };
}

function sanitizeInvitationContacts_(contacts) {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(function(contact) {
    return {
      id: String(contact && contact.id || '').trim(),
      name: String(contact && contact.name || '').trim(),
      email: String(contact && contact.email || '').trim().toLowerCase(),
      phone: String(contact && contact.phone || '').trim()
    };
  });
}

function sanitizeInvitationAuthorization_(authorization) {
  authorization = authorization || {};
  return {
    resposta_id: String(authorization.resposta_id || '').trim()
  };
}

function callLauncherPanelInvite_(request, tutorEmail, secret) {
  var payload = {
    action: 'panel_invite',
    secret: secret,
    target: request.target,
    tutor_email: tutorEmail,
    student: request.student,
    contacts: request.contacts,
    authorization: request.authorization
  };
  var response = UrlFetchApp.fetch(APP_CONFIG.formLauncherUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var body;

  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error('Launcher response is not valid JSON. HTTP ' + status + ': ' + text.slice(0, 200));
  }

  if (status < 200 || status >= 300 || !body.ok) {
    throw new Error('Launcher invitation failed. HTTP ' + status + ': ' + JSON.stringify(body));
  }

  return body;
}

function callLauncherPrintLink_(request, tutorEmail, secret) {
  var payload = {
    action: 'panel_print_link',
    secret: secret,
    tutor_email: tutorEmail,
    student: request.student,
    authorization: request.authorization
  };
  var response = UrlFetchApp.fetch(APP_CONFIG.formLauncherUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var body;

  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error('Launcher print-link response is not valid JSON. HTTP ' + status + ': ' + text.slice(0, 200));
  }

  if (status < 200 || status >= 300 || !body.ok || !body.url) {
    throw new Error('Launcher print-link failed. HTTP ' + status + ': ' + JSON.stringify(body));
  }

  return { ok: true, url: body.url };
}

function safeInvitationError_(request, error) {
  var student = request && request.student ? request.student.name || request.student.id : '';
  var target = request && request.target === 'student' ? 'alumne' : 'tutors';
  return [student, target, error && error.message ? error.message : String(error)].filter(Boolean).join(' - ');
}
