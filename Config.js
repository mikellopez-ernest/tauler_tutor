var APP_CONFIG = {
  domain: 'iernestlluch.cat',
  timezone: 'Europe/Madrid',
  dinantiaBaseUrl: 'https://app.dinantia.com/api/web',
  userTutorErrorMessage: "Sembla que el teu correu no correspon a cap tutoria. En cas que hi hagi un error, contacta amb el cap d'estudis",
  genericErrorTitle: "S'ha produït un error"
};

var SCRIPT_PROPERTIES = {
  databaseId: 'db',
  dinantiaUser: 'dinantia_api_user',
  dinantiaSecret: 'dinantia_api_secret'
};

var TABLES = {
  teachers: 'Dades de professors',
  teachingLoad: 'Càrrega lectiva',
  dinantia: 'Dinantia'
};

var SHEETS = {
  teacherList: 'Llista',
  leaveAbsence: 'leave_absence',
  responsibilities: 'carrecs',
  classGroups: 'class_groups',
  registry: 'tables'
};

var HEADERS = {
  teacherEmail: 'CORREU INSTIT',
  teacherCode: 'REDUÏT',
  teacherFirstName: 'NOM',
  teacherSurname1: 'COGNOM1',
  teacherSurname2: 'COGNOM2',
  teacherSubstitute: 'SUBST?',
  leaveTeacherCode: 'teacher_code',
  leaveSubstituteCode: 'substitute_code',
  leaveStartDate: 'start_date',
  leaveEndDate: 'end_date',
  responsibilityName: 'carrec',
  responsibilityAssignee: 'asignado?',
  classGroupDinantiaId: 'dinantia_group_name',
  classGroupTutorResponsibility: 'tutor_carrec'
};

