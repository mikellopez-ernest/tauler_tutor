function AppError_(code, message, userMessage) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.userMessage = userMessage || message;
}

AppError_.prototype = Object.create(Error.prototype);
AppError_.prototype.constructor = AppError_;

function tutorResolutionError_(message) {
  return new AppError_('TUTOR_RESOLUTION', message, APP_CONFIG.userTutorErrorMessage);
}

function configurationError_(message) {
  return new AppError_('CONFIGURATION', message, message);
}

function accessError_(message) {
  return new AppError_('ACCESS', message, APP_CONFIG.genericErrorTitle + ': ' + message);
}

function isAppError_(error) {
  return error && error.name === 'AppError';
}

function errorToViewModel_(error) {
  if (isAppError_(error) && error.code === 'TUTOR_RESOLUTION') {
    return {
      type: 'tutor',
      title: 'No hem trobat cap tutoria',
      message: error.userMessage,
      details: ''
    };
  }

  var message = error && error.message ? error.message : String(error);
  return {
    type: 'generic',
    title: APP_CONFIG.genericErrorTitle,
    message: APP_CONFIG.genericErrorTitle,
    details: message
  };
}

