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

function fetchAllDinantiaAccounts_() {
  var credentials = getDinantiaCredentials_();
  var accounts = [];
  var page = 1;

  while (true) {
    var body = fetchDinantiaJson_('/v1.2/accounts/index?limit=100&page=' + page, credentials);
    accounts = accounts.concat(body.data || []);

    if (!body.pagination || !body.pagination.has_next_page) {
      break;
    }

    page++;
  }

  return accounts;
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
    parents: account.parents || []
  };
}

function fetchDinantiaContactsForStudents_(students) {
  var credentials = getDinantiaCredentials_();
  var contactById = {};

  students.forEach(function(student) {
    (student.parents || []).forEach(function(parentId) {
      if (parentId && !contactById[parentId]) {
        contactById[parentId] = fetchDinantiaAccount_(parentId, credentials);
      }
    });
  });

  return students.map(function(student) {
    var contacts = (student.parents || []).map(function(parentId, index) {
      var account = parentId ? contactById[parentId] : null;
      var contact = contactFromAccount_(account, parentId);
      contact.position = index + 1;
      return contact;
    });

    return {
      id: student.id,
      name: student.name,
      groupName: student.groupName || '',
      contacts: contacts
    };
  });
}

function fetchDinantiaAccount_(accountId, credentials) {
  var body = fetchDinantiaJson_('/v1.2/accounts/view/' + encodeURIComponent(accountId), credentials);
  return body.data || null;
}

function contactFromAccount_(account, fallbackId) {
  if (!account) {
    return {
      id: fallbackId || '',
      name: '',
      phone: '',
      email: ''
    };
  }

  return {
    id: account.id || fallbackId || '',
    name: account.name || '',
    phone: account.phone || '',
    email: account.email || ''
  };
}

function updateDinantiaAccountFields_(accountId, fields) {
  var credentials = getDinantiaCredentials_();
  var auth = Utilities.base64Encode(credentials.user + ':' + credentials.secret);
  var response = UrlFetchApp.fetch(APP_CONFIG.dinantiaBaseUrl + '/v1.2/accounts/update/' + encodeURIComponent(accountId), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(fields),
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
    throw new Error('Dinantia update response is not valid JSON. HTTP ' + status + ': ' + bodyText);
  }

  if (status < 200 || status >= 300 || body.success === false) {
    throw new Error('Dinantia account update failed. HTTP ' + status + ': ' + bodyText);
  }

  return body.data;
}
