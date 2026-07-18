var APP_CONFIG = {
  domain: 'iernestlluch.cat',
  timezone: 'Europe/Madrid',
  dinantiaBaseUrl: 'https://app.dinantia.com/api/web',
  formLauncherUrl: 'https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec',
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
  dinantia: 'Dinantia',
  students: 'Dades alumnes',
  authorizations: 'Autoritzacions'
};

var SHEETS = {
  teacherList: 'Llista',
  leaveAbsence: 'leave_absence',
  responsibilities: 'carrecs',
  classGroups: 'class_groups',
  changelog: 'changelog',
  registry: 'tables',
  authorizations: 'autoritzacions'
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
  classGroupTutorResponsibility: 'tutor_carrec',
  classGroupStudentDataSheet: 'dades_alumnes_sheet',
  studentId: 'ID',
  studentBirthdate: 'Data Naixement',
  changelogId: 'id',
  changelogDatetime: 'datetime',
  changelogUserMail: 'user_mail',
  changelogFieldChanged: 'field_changed',
  changelogOldValue: 'old_value',
  changelogNewValue: 'new_value',
  changelogStudentId: 'student_id',
  authorizationStudentId: 'id_student'
};

var CHANGELOG_FIELDS = {
  birthdate: 'Birthdate',
  contact1Name: 'Contact1Name',
  contact1Phone: 'Contact1Phone',
  contact1Email: 'Contact1Email',
  contact2Name: 'Contact2Name',
  contact2Phone: 'Contact2Phone',
  contact2Email: 'Contact2Email'
};

var CONTACT_FIELD_TO_ACCOUNT_FIELD = {
  Contact1Name: 'name',
  Contact1Phone: 'phone',
  Contact1Email: 'email',
  Contact2Name: 'name',
  Contact2Phone: 'phone',
  Contact2Email: 'email'
};
