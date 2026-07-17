# Dinantia Group Students Lookup Example

This example shows the full lookup path between the registry-backed spreadsheet database and the Dinantia API.

It is a temporary/manual test function, not production architecture.

## Purpose

Given a teacher email:

1. Find the teacher in `Dades de professors` -> `Llista` using `CORREU INSTIT`.
2. If the teacher has `SUBST?` true, resolve the main teacher through `Dades de professors` -> `leave_absence`.
3. Build the resolved teacher full name from `NOM COGNOM1 COGNOM2`.
4. Find the teacher's `carrec` through `Càrrega lectiva` -> `carrecs`.`asignado?`.
5. Find the Dinantia group ID through `Dinantia` -> `class_groups`.`tutor_carrec`.
6. Call Dinantia `GET /v1.2/accounts/index` and return students whose `groups.member` includes that Dinantia group ID.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |

## Manual Test Code

Change `teacher@example.com` before running the function manually in Apps Script.

```javascript
function tempTestDinantiaGroupStudents() {
  const teacherEmail = 'teacher@example.com'; // <-- change this
  const DINANTIA_BASE_URL = 'https://app.dinantia.com/api/web';

  const props = PropertiesService.getScriptProperties();

  const dbSpreadsheetId = requiredProp_(props, 'db');
  const dinantiaUser = requiredProp_(props, 'dinantia_api_user');
  const dinantiaSecret = requiredProp_(props, 'dinantia_api_secret');

  const registry = loadRegistry_(dbSpreadsheetId);

  const teachersSheet = openTableSheet_(registry, 'Dades de professors', 'Llista');
  const leaveSheet = openTableSheet_(registry, 'Dades de professors', 'leave_absence');
  const carrecsSheet = openTableSheet_(registry, 'Càrrega lectiva', 'carrecs');
  const classGroupsSheet = openTableSheet_(registry, 'Dinantia', 'class_groups');

  const teacher = findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, teacherEmail);
  if (!teacher) {
    throw new Error('Teacher not found by CORREU INSTIT: ' + teacherEmail);
  }

  const carrec = findCarrecByTeacherFullName_(carrecsSheet, teacher.fullName);
  if (!carrec) {
    throw new Error('No carrec found for teacher full name: ' + teacher.fullName);
  }

  const dinantiaGroupId = findDinantiaGroupIdByCarrec_(classGroupsSheet, carrec.carrec);
  if (!dinantiaGroupId) {
    throw new Error('No Dinantia group id found for carrec: ' + carrec.carrec);
  }

  const students = fetchDinantiaStudentsInGroup_(
    DINANTIA_BASE_URL,
    dinantiaUser,
    dinantiaSecret,
    dinantiaGroupId
  );

  Logger.log(JSON.stringify({
    teacherEmail,
    resolvedTeacher: teacher,
    carrec: carrec.carrec,
    dinantiaGroupId,
    studentCount: students.length,
    students
  }, null, 2));

  return students;
}

function requiredProp_(props, key) {
  const value = props.getProperty(key);
  if (!value || !String(value).trim()) {
    throw new Error('Missing required script property: ' + key);
  }
  return String(value).trim();
}

function loadRegistry_(dbSpreadsheetId) {
  const ss = SpreadsheetApp.openById(dbSpreadsheetId);
  const sheet = ss.getSheetByName('tables');
  if (!sheet) throw new Error('Registry spreadsheet must contain sheet "tables".');

  const values = sheet.getDataRange().getValues();
  const registry = {};

  values.forEach(row => {
    const tableName = String(row[0] || '').trim();
    const spreadsheetId = String(row[1] || '').trim();
    if (tableName && spreadsheetId) registry[tableName] = spreadsheetId;
  });

  return registry;
}

function openTableSheet_(registry, tableName, sheetName) {
  const spreadsheetId = registry[tableName];
  if (!spreadsheetId) throw new Error('Missing table in registry: ' + tableName);

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet "' + sheetName + '" in logical table "' + tableName + '".');

  return sheet;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    const key = String(header || '').trim();
    if (key) map[key] = index;
  });
  return map;
}

function fullNameFromRow_(row, headerMap) {
  return [
    row[headerMap['NOM']],
    row[headerMap['COGNOM1']],
    row[headerMap['COGNOM2']]
  ].map(v => String(v || '').trim()).filter(Boolean).join(' ');
}

function textKey_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function isTrue_(value) {
  return value === true || String(value).trim().toUpperCase() === 'TRUE';
}

function findTeacherForEmailOrActiveSubstitution_(teachersSheet, leaveSheet, email) {
  const teacherByEmail = findTeacherByEmail_(teachersSheet, email);

  if (!teacherByEmail) return null;

  if (!teacherByEmail.isSubstitute) {
    return teacherByEmail;
  }

  const activeLeave = findActiveLeaveBySubstituteCode_(leaveSheet, teacherByEmail.reduit);

  if (!activeLeave) {
    throw new Error(
      'Teacher found by CORREU INSTIT is marked as substitute, but no active leave_absence row was found for substitute_code: ' +
      teacherByEmail.reduit
    );
  }

  const mainTeacher = findTeacherByReduit_(teachersSheet, activeLeave.teacherCode);

  if (!mainTeacher) {
    throw new Error(
      'Active leave_absence row found, but main teacher could not be resolved by REDUÏT teacher_code: ' +
      activeLeave.teacherCode
    );
  }

  return {
    row: mainTeacher.row,
    reduit: mainTeacher.reduit,
    fullName: mainTeacher.fullName,
    isSubstitute: mainTeacher.isSubstitute,
    resolvedFromSubstitute: {
      substituteEmail: email,
      substituteReduit: teacherByEmail.reduit,
      substituteFullName: teacherByEmail.fullName,
      leaveTeacherCode: activeLeave.teacherCode,
      leaveSubstituteCode: activeLeave.substituteCode,
      leaveStartDate: activeLeave.startDate,
      leaveEndDate: activeLeave.endDate
    }
  };
}

function findTeacherByEmail_(teachersSheet, email) {
  const values = teachersSheet.getDataRange().getValues();
  const h = getHeaderMap_(teachersSheet);
  const targetEmail = String(email || '').trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowEmail = String(row[h['CORREU INSTIT']] || '').trim().toLowerCase();

    if (rowEmail === targetEmail) {
      return {
        row,
        reduit: String(row[h['REDUÏT']] || '').trim(),
        fullName: fullNameFromRow_(row, h),
        isSubstitute: isTrue_(row[h['SUBST?']])
      };
    }
  }

  return null;
}

function findActiveLeaveBySubstituteCode_(leaveSheet, substituteReduit) {
  const values = leaveSheet.getDataRange().getValues();
  const h = getHeaderMap_(leaveSheet);
  const today = todayDateOnly_();
  const substituteKey = codeKey_(substituteReduit);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowSubstituteKey = codeKey_(row[h['substitute_code']]);

    if (rowSubstituteKey !== substituteKey) continue;

    const start = asDateOnly_(row[h['start_date']]);
    const end = asDateOnly_(row[h['end_date']]);

    if (!start) continue;

    const isActive = start <= today && (!end || end >= today);

    if (isActive) {
      return {
        teacherCode: String(row[h['teacher_code']] || '').trim(),
        substituteCode: String(row[h['substitute_code']] || '').trim(),
        startDate: row[h['start_date']],
        endDate: row[h['end_date']]
      };
    }
  }

  return null;
}

function findTeacherByReduit_(teachersSheet, reduit) {
  const values = teachersSheet.getDataRange().getValues();
  const h = getHeaderMap_(teachersSheet);
  const target = codeKey_(reduit);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (codeKey_(row[h['REDUÏT']]) === target) {
      return {
        row,
        reduit: String(row[h['REDUÏT']] || '').trim(),
        fullName: fullNameFromRow_(row, h),
        isSubstitute: isTrue_(row[h['SUBST?']])
      };
    }
  }

  return null;
}

function todayDateOnly_() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function asDateOnly_(value) {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function findCarrecByTeacherFullName_(carrecsSheet, fullName) {
  const values = carrecsSheet.getDataRange().getValues();
  const h = getHeaderMap_(carrecsSheet);
  const target = textKey_(fullName);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (textKey_(row[h['asignado?']]) === target) {
      return {
        carrec: String(row[h['carrec']] || '').trim(),
        assignedTo: String(row[h['asignado?']] || '').trim()
      };
    }
  }

  return null;
}

function findDinantiaGroupIdByCarrec_(classGroupsSheet, carrec) {
  const values = classGroupsSheet.getDataRange().getValues();
  const h = getHeaderMap_(classGroupsSheet);
  const target = textKey_(carrec);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (textKey_(row[h['tutor_carrec']]) === target) {
      return String(row[h['dinantia_group_name']] || '').trim();
    }
  }

  return null;
}

function fetchDinantiaStudentsInGroup_(baseUrl, user, secret, groupId) {
  const auth = Utilities.base64Encode(user + ':' + secret);
  const students = [];
  let page = 1;

  while (true) {
    const url = baseUrl + '/v1.2/accounts/index?limit=100&page=' + page;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + auth,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      },
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const bodyText = response.getContentText();
    const body = JSON.parse(bodyText);

    if (status < 200 || status >= 300 || body.success === false) {
      throw new Error('Dinantia accounts request failed: HTTP ' + status + ' ' + bodyText);
    }

    (body.data || []).forEach(account => {
      const roles = account.roles || [];
      const memberGroups = account.groups && account.groups.member ? account.groups.member : [];

      if (roles.indexOf('Student') !== -1 && memberGroups.indexOf(groupId) !== -1) {
        students.push(account);
      }
    });

    if (!body.pagination || !body.pagination.has_next_page) break;
    page++;
  }

  return students;
}
```

## Notes From The Working Test

- `CORREU INSTIT` is the teacher email lookup column.
- `REDUÏT` is the teacher code column in `Llista`.
- If the matched teacher is not a substitute, the lookup continues with that teacher.
- If the matched teacher is a substitute, the lookup requires an active `leave_absence` row where `substitute_code` matches the substitute `REDUÏT`.
- Active leave means `start_date` is on or before today and `end_date` is blank or on or after today.
- If no active leave is found for a substitute teacher, the test must fail clearly.
- Dinantia students are read from `GET /v1.2/accounts/index` and filtered locally by:
  - `roles` containing `Student`
  - `groups.member` containing the resolved Dinantia group ID

