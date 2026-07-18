/**
 * Web app entry point.
 */
function doGet() {
  return renderApp_();
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
function loadInitialDataJson() {
  return JSON.stringify(loadInitialData_());
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
