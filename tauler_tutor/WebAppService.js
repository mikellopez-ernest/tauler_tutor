function renderApp_(options) {
  return renderTemplate_(options || {});
}

function loadInitialData_(debug) {
  try {
    var email = getCurrentUserEmail_();
    logInfo_('initial_load_started', { email: email });
    var tutorGroup = resolveTutorGroupForEmail_(email);
    logInfo_('tutor_group_resolved', {
      email: email,
      teacher: tutorGroup.teacherLabel,
      responsibility: tutorGroup.responsibility && tutorGroup.responsibility.name,
      groups: (tutorGroup.groups || []).map(function(group) { return group.dinantiaGroupId; })
    });
    var students = loadStudentsForTutorGroupsCached_(tutorGroup.groups);
    logInfo_('students_loaded', { email: email, count: students.length });
    students.sort(function(a, b) {
      var groupCompare = String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ca', { sensitivity: 'base' });
      if (tutorGroup.hasMultipleGroups && groupCompare !== 0) return groupCompare;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
    });
    return {
      ok: true,
      error: null,
      tutorGroup: tutorGroup,
      groups: tutorGroup.groups,
      students: students,
      contacts: [],
      showBirthdate: true,
      formLauncherUrl: APP_CONFIG.formLauncherUrl
    };
  } catch (error) {
    logError_('initial_load_failed', error, {});
    console.error(error && error.stack ? error.stack : error);
    var viewModel = errorToViewModel_(error);
    if (debug === true) {
      viewModel.debug = buildResolverDebug_();
    }
    return {
      ok: false,
      error: viewModel,
      tutorGroup: null,
      students: [],
      contacts: [],
      showBirthdate: false
    };
  }
}

function loadContactsForStudents_(students) {
  try {
    getCurrentUserEmail_();
    var sanitized = sanitizeContactStudents_(students);
    logInfo_('contacts_load_started', { studentCount: sanitized.length });
    var contacts = loadContactsForStudentsCached_(sanitized);
    logInfo_('contacts_loaded', { studentCount: sanitized.length, contactRows: contacts.length });
    return {
      ok: true,
      contacts: contacts
    };
  } catch (error) {
    logError_('contacts_load_failed', error, {});
    return {
      ok: false,
      error: errorToViewModel_(error),
      contacts: []
    };
  }
}

function sanitizeContactStudents_(students) {
  if (!Array.isArray(students)) return [];
  return students.map(function(student) {
    return {
      id: String(student && student.id || '').trim(),
      name: String(student && student.name || '').trim(),
      groupName: String(student && student.groupName || '').trim(),
      parents: Array.isArray(student && student.parents) ? student.parents.map(function(parentId) {
        return String(parentId || '').trim();
      }).filter(Boolean) : []
    };
  }).filter(function(student) {
    return student.id;
  });
}

function loadStudentsForTutorGroupsCached_(groups) {
  try {
    var cached = loadStudentsFromCacheForGroups_(groups);
    if (cached.length) {
      logInfo_('students_loaded_from_cache', { count: cached.length });
      return cached;
    }
    logWarn_('students_cache_empty_live_fallback', { groups: (groups || []).map(function(group) { return group.dinantiaGroupId; }) });
  } catch (error) {
    logError_('students_cache_load_failed_live_fallback', error, {});
  }
  return loadStudentsForTutorGroups_(groups);
}

function loadContactsForStudentsCached_(students) {
  try {
    var cached = loadContactsFromCacheForStudents_(students);
    if (cached.length) {
      logInfo_('contacts_loaded_from_cache', { count: cached.length });
      return cached;
    }
    logWarn_('contacts_cache_empty_live_fallback', { students: (students || []).length });
  } catch (error) {
    logError_('contacts_cache_load_failed_live_fallback', error, {});
  }
  return fetchDinantiaContactsForStudents_(students);
}

function loadStudentsForTutorGroups_(groups) {
  var students = [];
  (groups || []).forEach(function(group) {
    var dinantiaStudents = fetchDinantiaStudentsInGroup_(group.dinantiaGroupId);
    var enriched = enrichStudentsWithLocalBirthdates_(dinantiaStudents, group.studentDataSheetName, group.dinantiaGroupId);
    students = students.concat(enriched);
  });
  return students;
}

function renderTemplate_(options) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.debugEnabled = options && options.debug === true;

  return template.evaluate()
    .setTitle('Tauler de tutoria')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getCurrentUserEmail_() {
  var email = Session.getActiveUser().getEmail();

  if (!email || !String(email).trim()) {
    throw accessError_("No s'ha pogut identificar l'usuari actiu.");
  }

  email = String(email).trim().toLowerCase();

  if (email.split('@').pop() !== APP_CONFIG.domain) {
    throw accessError_('Aquest aplicatiu només és accessible per a usuaris del domini ' + APP_CONFIG.domain + '.');
  }

  return email;
}
