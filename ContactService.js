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
    updatesByContactId[change.contactId][change.accountField] = change.newValue;
  });

  Object.keys(updatesByContactId).forEach(function(contactId) {
    updateDinantiaAccountFields_(contactId, updatesByContactId[contactId]);
  });

  appendChangelogRows_(sanitized, userEmail);

  return { saved: sanitized.length };
}

function sanitizeContactChanges_(changes) {
  return changes.map(function(change) {
    var fieldChanged = String(change.fieldChanged || '').trim();
    var accountField = CONTACT_FIELD_TO_ACCOUNT_FIELD[fieldChanged];
    var contactId = String(change.contactId || '').trim();
    var studentId = String(change.studentId || '').trim();

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
      oldValue: String(change.oldValue === null || change.oldValue === undefined ? '' : change.oldValue),
      newValue: String(change.newValue === null || change.newValue === undefined ? '' : change.newValue)
    };
  }).filter(function(change) {
    return change.oldValue !== change.newValue;
  });
}
