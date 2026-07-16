function getRequiredScriptProperty_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value || !String(value).trim()) {
    throw configurationError_('Missing required script property: ' + key);
  }
  return String(value).trim();
}

function getDinantiaCredentials_() {
  return {
    user: getRequiredScriptProperty_(SCRIPT_PROPERTIES.dinantiaUser),
    secret: getRequiredScriptProperty_(SCRIPT_PROPERTIES.dinantiaSecret)
  };
}

