/**
 * Web app entry point.
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  return renderApp_({ debug: params.debug === '1' });
}

/**
 * Includes an HTML partial in a template.
 */
function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Client-callable initial data endpoint.
 */
function loadInitialDataJson(debug) {
  return JSON.stringify(loadInitialData_(debug === true));
}

/**
 * Client-callable save endpoint for edited contact fields.
 */
function saveContactChanges(changes) {
  return saveContactChanges_(changes);
}


/**
 * Client-callable authorization data endpoint.
 */
function loadAuthorizationDataJson() {
  return JSON.stringify(loadAuthorizationData_());
}

/**
 * Client-callable authorization cache refresh endpoint.
 */
function refreshAuthorizationDataJson() {
  var email = getCurrentUserEmail_();
  var tutorGroup = resolveTutorGroupForEmail_(email);
  if (tutorGroup.isAdmin === true) {
    cacheRebuildTutorPanel_();
  }
  cacheRefreshAuthorizations_();
  var authorizationData = loadAuthorizationData_();
  if (tutorGroup.isAdmin === true && authorizationData.ok === true) {
    var students = loadStudentsForTutorGroupsCached_(tutorGroup.groups);
    students.sort(function(a, b) {
      var groupCompare = String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ca', { sensitivity: 'base' });
      if (tutorGroup.hasMultipleGroups && groupCompare !== 0) return groupCompare;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ca', { sensitivity: 'base' });
    });
    authorizationData.fullCacheRebuilt = true;
    authorizationData.tutorGroup = tutorGroup;
    authorizationData.groups = tutorGroup.groups;
    authorizationData.students = students;
    authorizationData.isAdmin = true;
  }
  return JSON.stringify(authorizationData);
}

/**
 * Client-callable contact data endpoint. Loaded lazily from Contactes.
 */
function loadContactsForStudents(students) {
  return JSON.stringify(loadContactsForStudents_(students));
}

/**
 * Client-callable invitation endpoint for pending authorization flows.
 */
function sendAuthorizationInvitations(requests) {
  return sendAuthorizationInvitations_(requests);
}

/**
 * Client-callable endpoint to create a short-lived print/review link.
 */
function createAuthorizationPrintLink(request) {
  return createAuthorizationPrintLink_(request);
}

/**
 * Client-callable endpoint to invalidate a submitted authorization response.
 */
function invalidateAuthorizationResponse(request) {
  return invalidateAuthorizationResponse_(request);
}
