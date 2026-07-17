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
 * Client-callable save endpoint for edited contact fields.
 */
function saveContactChanges(changes) {
  return saveContactChanges_(changes);
}
