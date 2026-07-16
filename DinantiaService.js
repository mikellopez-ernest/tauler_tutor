function fetchDinantiaStudentsInGroup_(groupId) {
  var credentials = getDinantiaCredentials_();
  var students = [];
  var page = 1;

  while (true) {
    var body = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=' + page, credentials);

    (body.data || []).forEach(function(account) {
      var roles = account.roles || [];
      var memberGroups = account.groups && account.groups.member ? account.groups.member : [];

      if (roles.indexOf('Student') !== -1 && memberGroups.indexOf(groupId) !== -1) {
        students.push(studentFromAccount_(account));
      }
    });

    if (!body.pagination || !body.pagination.has_next_page) {
      break;
    }

    page++;
  }

  return students;
}

function fetchDinantiaJson_(path, credentials) {
  var auth = Utilities.base64Encode(credentials.user + ':' + credentials.secret);
  var response = UrlFetchApp.fetch(APP_CONFIG.dinantiaBaseUrl + path, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + auth,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var bodyText = response.getContentText();
  var body;

  try {
    body = JSON.parse(bodyText);
  } catch (error) {
    throw new Error('Dinantia response is not valid JSON. HTTP ' + status + ': ' + bodyText);
  }

  if (status < 200 || status >= 300 || body.success === false) {
    throw new Error('Dinantia request failed. HTTP ' + status + ': ' + bodyText);
  }

  return body;
}

function studentFromAccount_(account) {
  return {
    id: account.id || '',
    name: account.name || '',
    birthdate: extractBirthdate_(account)
  };
}

function extractBirthdate_(account) {
  var topLevelKeys = ['birthdate', 'birth_date', 'date_of_birth', 'data_naixement'];

  for (var i = 0; i < topLevelKeys.length; i++) {
    var key = topLevelKeys[i];
    if (account[key]) {
      return String(account[key]);
    }
  }

  var fields = account.fields || [];
  var fieldIds = ['birthdate', 'birth_date', 'date_of_birth', 'data_naixement', 'DATA_NAIXEMENT'];

  for (var j = 0; j < fields.length; j++) {
    var field = fields[j] || {};
    var fieldId = String(field.id || '').trim();
    if (fieldIds.indexOf(fieldId) !== -1 && field.value) {
      return String(field.value);
    }
  }

  return '';
}

