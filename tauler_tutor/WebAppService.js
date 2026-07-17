function renderApp_() {
  return renderTemplate_();
}

function loadInitialData_() {
  try {
    var email = getCurrentUserEmail_();
    var tutorGroup = resolveTutorGroupForEmail_(email);
    var dinantiaStudents = fetchDinantiaStudentsInGroup_(tutorGroup.dinantiaGroupId);
    var students = enrichStudentsWithLocalBirthdates_(dinantiaStudents, tutorGroup.studentDataSheetName);
    students.sort(function(a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
    });
    var contacts = fetchDinantiaContactsForStudents_(students);

    return {
      ok: true,
      error: null,
      tutorGroup: tutorGroup,
      students: students,
      contacts: contacts,
      showBirthdate: true
    };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return {
      ok: false,
      error: errorToViewModel_(error),
      tutorGroup: null,
      students: [],
      contacts: [],
      showBirthdate: false
    };
  }
}

function renderTemplate_() {
  var template = HtmlService.createTemplateFromFile('Index');

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
