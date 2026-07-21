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
  refreshAuthorizationsCache_();
  return JSON.stringify(loadAuthorizationData_());
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
