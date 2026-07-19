function logInfo_(eventName, details) {
  logEvent_('INFO', eventName, details);
}

function logWarn_(eventName, details) {
  logEvent_('WARN', eventName, details);
}

function logError_(eventName, error, details) {
  var payload = details || {};
  payload.errorName = error && error.name ? error.name : '';
  payload.errorCode = error && error.code ? error.code : '';
  payload.errorMessage = error && error.message ? error.message : String(error);
  payload.stack = error && error.stack ? String(error.stack).slice(0, 1800) : '';
  logEvent_('ERROR', eventName, payload);
}

function logEvent_(level, eventName, details) {
  var entry = {
    ts: Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    level: level,
    event: eventName,
    details: sanitizeLogDetails_(details || {})
  };
  console.log(JSON.stringify(entry));
}

function sanitizeLogDetails_(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(sanitizeLogDetails_);
  }
  if (typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function(key) {
      var lowered = String(key).toLowerCase();
      if (lowered.indexOf('secret') !== -1 || lowered.indexOf('token') !== -1 || lowered.indexOf('password') !== -1) {
        out[key] = '[REDACTED]';
        return;
      }
      out[key] = sanitizeLogDetails_(value[key]);
    });
    return out;
  }
  var text = String(value);
  return text.length > 500 ? text.slice(0, 500) + '...' : value;
}
