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

