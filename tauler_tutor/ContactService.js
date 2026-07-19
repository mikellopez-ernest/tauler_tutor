function saveContactChanges_(changes) {
  var userEmail = getCurrentUserEmail_();
  var sanitized = sanitizeContactChanges_(changes || []);

  if (!sanitized.length) {
    return { saved: 0 };
  }

  var updatesByContactId = {};

  sanitized.forEach(function(change) {
    if (!updatesByContactId[change.contactId]) {
      updatesByContactId[change.contactId] = {};
    }
    updatesByContactId[change.contactId][change.accountField] = change.apiValue;
  });

  Object.keys(updatesByContactId).forEach(function(contactId) {
    updateDinantiaAccountFields_(contactId, updatesByContactId[contactId]);
  });

  updateContactsCacheAfterSave_(sanitized);
  appendChangelogRows_(sanitized, userEmail);

  return {
    saved: sanitized.length,
    changes: sanitized.map(function(change) {
      return {
        studentId: change.studentId,
        contactId: change.contactId,
        fieldChanged: change.fieldChanged,
        newValue: change.newValue
      };
    })
  };
}

function sanitizeContactChanges_(changes) {
  return changes.map(function(change) {
    var fieldChanged = String(change.fieldChanged || '').trim();
    var accountField = getContactAccountField_(fieldChanged);
    var contactId = String(change.contactId || '').trim();
    var studentId = String(change.studentId || '').trim();
    var oldValue = String(change.oldValue === null || change.oldValue === undefined ? '' : change.oldValue);
    var newValue = String(change.newValue === null || change.newValue === undefined ? '' : change.newValue);

    if (!accountField) {
      throw new Error('Unsupported changelog field: ' + fieldChanged);
    }
    if (!contactId) {
      throw new Error('Missing contact account id for field: ' + fieldChanged);
    }
    if (!studentId) {
      throw new Error('Missing student id for field: ' + fieldChanged);
    }

    return {
      studentId: studentId,
      contactId: contactId,
      fieldChanged: fieldChanged,
      accountField: accountField,
      oldValue: accountField === 'phone' ? normalizeDinantiaPhone_(oldValue) : oldValue,
      newValue: accountField === 'phone' ? normalizeDinantiaPhone_(newValue) : newValue,
      apiValue: apiValueForDinantia_(accountField, newValue)
    };
  }).filter(function(change) {
    return change.oldValue !== change.newValue;
  });
}

function getContactAccountField_(fieldChanged) {
  var match = String(fieldChanged || '').match(/^Contact\d+(Name|Phone|Email)$/);

  if (!match) {
    return '';
  }

  return {
    Name: 'name',
    Phone: 'phone',
    Email: 'email'
  }[match[1]] || '';
}

function normalizeDinantiaPhone_(value) {
  var text = String(value || '').trim();

  if (!text) {
    return '';
  }

  var compact = text.replace(/[\s().-]/g, '');

  if (compact.indexOf('00') === 0) {
    return '+' + compact.slice(2);
  }

  if (compact.charAt(0) === '+') {
    return compact;
  }

  var digits = compact.replace(/\D/g, '');

  if (/^[6789]\d{8}$/.test(digits)) {
    return '+34' + digits;
  }

  throw new Error('Invalid phone number: ' + text);
}

function apiValueForDinantia_(accountField, value) {
  var text = String(value === null || value === undefined ? '' : value).trim();

  if (!text && (accountField === 'phone' || accountField === 'email')) {
    return null;
  }

  if (accountField === 'phone') {
    return normalizeDinantiaPhone_(text);
  }

  return text;
}
