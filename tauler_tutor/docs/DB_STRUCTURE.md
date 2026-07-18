# Database Structure

This document describes the database structure used by the app. The app must treat database locations as configurable data, not as hardcoded connector configuration.

## Script Properties

The Apps Script project must define these script properties.

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |

The app reads these values from script properties. If a required property is missing, blank, or only whitespace, the app must stop with a clear configuration error.

Apps Script access pattern:

```javascript
PropertiesService.getScriptProperties().getProperty('db')
```

## Registry Spreadsheet

The spreadsheet referenced by the `db` script property is the database registry.

It must contain a sheet named `tables`.

| Column | Meaning |
| --- | --- |
| A | Logical table name |
| B | Spreadsheet ID for that logical table |

Each row maps one logical table name to the spreadsheet that stores it. Logical table names are app-level names; spreadsheet IDs are deployment-specific values.

The connector must load this registry dynamically and must not hardcode the mappings.

## Logical Tables

Logical tables represent shared data domains. A logical table may contain one or more sheets inside its mapped spreadsheet.

Current examples:

| Logical table | Example sheet(s) |
| --- | --- |
| `Horaris` | `GPU001` |
| `Dades de professors` | `Llista`, `leave_absence` |
| `Càrrega lectiva` | `assignatures`, `carrecs` |
| `Dinantia` | `class_groups`, `changelog` |
| `Dades alumnes` | Group-specific student sheets referenced by `Dinantia` -> `class_groups`.`dades_alumnes_sheet` |
| `Autoritzacions` | `autoritzacions`, `persones_autoritzades`, `verification_tokens` |
| `Incidències` | `llistat_anual`, `config`, `meeting_records`, `study_group_students`, `study_group_teachers`, `3r_project`, `expulsions` |

These are examples of current shared tables. They may be referenced by app specs, but the connector must still discover their spreadsheet IDs through the registry.

## Generic Connector Responsibilities

The connector should provide generic helpers for opening and validating registry-backed spreadsheets and sheets.

Required helper responsibilities:

| Helper | Responsibility |
| --- | --- |
| `getDatabaseSpreadsheetId_()` | Read and validate script property `db`. |
| `loadTableRegistry_()` | Return a map from logical table name to spreadsheet ID. |
| `openTableSpreadsheet_(tableName)` | Open a logical table spreadsheet through the registry. |
| `openTableSheet_(tableName, sheetName)` | Open a requested sheet inside a requested logical table spreadsheet. |
| `openSheetByName_(spreadsheet, sheetName, context)` | Open a named sheet and produce contextual errors if missing. |
| `getHeaderMap_(sheet)` | Map row-1 header names to zero-based column indexes. |
| `requireHeaders_(sheet, requiredHeaders, context)` | Validate that required row-1 headers exist. |
| `codeKey_(value)` | Normalize short codes for joins and comparisons. |

Errors should include enough context to identify the missing property, registry entry, spreadsheet, sheet, or header.

## Header Convention

Unless a table-specific section states otherwise:

- Row 1 contains headers.
- Data starts in row 2.
- Headers are matched by their exact text.
- Required headers must be validated before reading or writing table data.

## Code Key Normalization

Short codes used for joins must be normalized before comparison.

This applies to teacher codes and similar short-code joins.

Required normalization:

```javascript
function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
```

All teacher-code comparisons must use this normalization.

## Shared Table: `Dades de professors` -> `Llista`

The logical table `Dades de professors` contains a sheet named `Llista`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `ESP` | Original teacher code. |
| `DEPT.` | Department code. |
| `NOM` | First name. |
| `COGNOM1` | First surname. |
| `COGNOM2` | Second surname. |
| `REDUÏT` | Short teacher code used by timetable logic. |
| `SITUACIO` | Status text. Do not infer substitute status from this. |
| `JORNADA` | Workload fraction. |
| `DNI` | ID document value. |
| `TELF` | Phone number. |
| `XTEC` | XTEC email. |
| `CORREU INSTIT` | Institutional/main email used for app teacher lookup. |
| `NOUS` | New teacher boolean flag. |
| `ACTIU` | Active teacher boolean flag. |
| `BAIXA?` | Leave-of-absence boolean flag. |
| `SUBST?` | Substitute boolean flag. |

### Teacher Identity Rules

- `ESP` is the original teacher code.
- `REDUÏT` is the short teacher code used by timetable logic.
- `REDUÏT` joins to teacher codes in timetable sheets such as `Horaris` -> `GPU001`.
- `REDUÏT` joins to both `leave_absence.teacher_code` and `leave_absence.substitute_code`.
- Full name is built as `NOM COGNOM1 COGNOM2`, omitting blank parts.
- Teacher names should be sorted by `COGNOM1`, then `COGNOM2`, then `NOM`.

### Teacher Boolean Rules

Boolean fields:

- `NOUS`
- `ACTIU`
- `BAIXA?`
- `SUBST?`

Read as true:

- Real boolean `true`
- String `TRUE`

Write boolean fields as real booleans.

### Teacher Status Rules

- `ACTIU` true means the teacher is active.
- `SUBST?` is the only substitute status source.
- Do not infer substitute status from `SITUACIO`.
- Eligible substitute means `SUBST?` true and `ACTIU` true.

### Teacher Full Name Join

Some tables reference teachers by full name instead of code.

For these joins, the teacher full name from `Llista` is built as:

```text
NOM + " " + COGNOM1 + " " + COGNOM2
```

Blank name parts must be omitted so the final value does not contain duplicate or trailing spaces.

## Shared Table: `Dades de professors` -> `leave_absence`

The logical table `Dades de professors` contains a sheet named `leave_absence`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `row_id` | Original row number in `Llista`. |
| `teacher_code` | Original teacher `REDUÏT`. |
| `substitute_code` | Substitute teacher `REDUÏT`. |
| `start_date` | Leave start date. |
| `end_date` | Leave end date. Blank means still active. |
| `comments` | Free comments. |

### Leave Rules

- A leave is active when the relevant date is between `start_date` and `end_date`, inclusive.
- Blank `end_date` means the leave is active until further notice.
- The relevant date is usually today in the Apps Script timezone `Europe/Madrid`.
- `teacher_code` stores the original teacher `REDUÏT`.
- `substitute_code` stores the substitute teacher `REDUÏT`.
- Both `teacher_code` and `substitute_code` refer to teachers in `Llista` using `REDUÏT`.
- If a substitute cannot be resolved, keep the original teacher and continue.

## Effective Teacher Resolution

Apps that need the effective teacher for a timetable or source row must resolve absences and substitutions consistently.

Resolution process:

1. Read the timetable/source teacher code.
2. Treat the source teacher code as `REDUÏT`.
3. Find an active `leave_absence` row where `teacher_code` matches that `REDUÏT`.
4. If an active leave is found, replace the teacher with the substitute whose `REDUÏT` equals `substitute_code`.
5. If no active leave exists, keep the original teacher.
6. If the substitute code is invalid or cannot be resolved, keep the original teacher.

All teacher code comparisons in this process must use `codeKey_`.

## Registered Relationships

The current app uses these registered sheets:

- `Dades de professors` -> `Llista`
- `Dades de professors` -> `leave_absence`
- `Càrrega lectiva` -> `carrecs`
- `Dinantia` -> `class_groups`
- `Dinantia` -> `changelog`
- `Dades alumnes` -> dynamic sheet name from `class_groups.dades_alumnes_sheet`
- `Autoritzacions` -> `autoritzacions`
- `Autoritzacions` -> `persones_autoritzades`
- `Autoritzacions` -> `verification_tokens`

Relationships:

| From | To | Rule |
| --- | --- | --- |
| `leave_absence.teacher_code` | `Llista.REDUÏT` | Original teacher on leave. |
| `leave_absence.substitute_code` | `Llista.REDUÏT` | Substitute teacher covering the leave. |
| `carrecs.asignado?` | `Llista` full name | Teacher responsible for the group. Full name is `NOM COGNOM1 COGNOM2`, omitting blanks. |
| `class_groups.tutor_carrec` | `carrecs.carrec` | Dinantia group maps to a tutor responsibility/group entry. |
| `class_groups.dades_alumnes_sheet` | `Dades alumnes` sheet name | Local student-data sheet for the resolved group. |
| `persones_autoritzades.resposta_id` | `autoritzacions.resposta_id` | Authorized pickup persons belong to one submitted authorization response. |

Both teacher fields in `leave_absence` always refer to `Llista.REDUÏT`.


## Shared Table: `Autoritzacions` -> `autoritzacions`

The logical table `Autoritzacions` contains a sheet named `autoritzacions`.

This sheet stores one row for each submitted authorization, declaration, and communication form response.

Row 1 contains headers. Data starts in row 2.

Primary key:

| Header | Meaning |
| --- | --- |
| `resposta_id` | Unique response identifier generated by the app. |

Metadata headers:

| Header | Meaning |
| --- | --- |
| `data_hora_enviament` | Form submission datetime in ISO8601 format. |
| `idioma_formulari` | Language selected while filling the form. |
| `codi_document` | Automatically selected document model code. |
| `tipus_alumne` | Student model/type selected by the form. |
| `curs_inici` | Initial academic year. |
| `curs_fi` | Final academic year. |

School headers:

| Header | Meaning |
| --- | --- |
| `centre_nom` | Official school name. |
| `centre_codi` | Official school code. |
| `municipi` | School municipality. |
| `centre_email` | Institutional school email. |

Student headers:

| Header | Meaning |
| --- | --- |
| `alumne_nom` | Student full name. |
| `alumne_document` | Student DNI, NIE, passport, TIS, or other identity document. |
| `id_student` | Internal student identifier from the school database. Located in column AX in the current sheet layout. |

Respondent headers:

| Header | Meaning |
| --- | --- |
| `responent_nom_sencer` | Full name of the person answering/submitting the form. |
| `responent_telefon` | Phone number of the person answering/submitting the form. |

Legal-responsible headers:

| Header | Meaning |
| --- | --- |
| `responsable_nom` | Legal responsible person's full name. |
| `responsable_document` | Legal responsible person's identity document. |

Authorization and declaration headers:

| Header | Meaning |
| --- | --- |
| `sortida_sola` | Authorization for the student to leave the school alone outside teaching hours. |
| `sortida_esbarjo` | Authorization for underage post-compulsory students to leave during recess. |
| `comunicacio_academica` | Authorization to communicate academic/attendance data to a third person. |
| `sortides_municipi` | Authorization for pedagogical trips inside the municipality. |
| `imatge_intranet` | Consent to publish image/voice in restricted intranet spaces. |
| `imatge_web` | Consent to publish image/voice on open internet spaces. |
| `imatge_externa` | Consent to publish image/voice on externally managed platforms. |
| `plataformes_externes` | External platforms or access details. |
| `publicacio_inicials` | Deprecated/not used by the current form UI. Do not show in the tutor matrix and do not collect from families in the current version. |
| `obra_oberta` | Consent to publish created work on open-access platforms. |
| `obra_centre` | Consent to publish created work in school communication spaces. |
| `obra_biblioteca` | Consent to preserve created work in the physical or digital school library. |
| `obra_repositori` | Consent to preserve created work in the Department repository. |
| `declaracio_plataformes` | Declaration that digital platform information has been received. |
| `comunicacio_salut` | Authorization to communicate health-related situations to the emergency contact. |
| `administracio_medicacio` | Authorization for medication administration during school hours. |
| `paracetamol` | Authorization for paracetamol administration under the stated conditions. |

Academic contact headers:

| Header | Meaning |
| --- | --- |
| `acad_contacte_nom` | Full name of the designated academic communication contact. |
| `acad_contacte_email` | Email of the designated academic communication contact. |
| `acad_contacte_relacio` | Relationship between the designated contact and the student. |

Emergency contact headers:

| Header | Meaning |
| --- | --- |
| `emergencia_nom` | Emergency contact full name. |
| `emergencia_telefon` | Emergency contact phone. |
| `emergencia_relacio` | Relationship between the emergency contact and the student. |

Health information headers:

| Header | Meaning |
| --- | --- |
| `problemes_salut` | Diagnosed health issues, contact type, and reactions. |
| `altres_salut` | Other relevant health information. |
| `medicacio` | Medication name. |
| `posologia` | Medication posology. |
| `dosi` | Medication dose. |

Signature headers:

| Header | Meaning |
| --- | --- |
| `lloc` | Signature place, prefilled from form constants. |
| `data_signatura` | Signature/submission date, automatically filled with today's date. |
| `signatura_responsable` | Hidden boolean indicating whether the responsible person signed/accepted. |
| `signatura_alumne` | Hidden boolean indicating whether the student signed/accepted. |

Internal headers:

| Header | Meaning |
| --- | --- |
| `estat_validacio` | Internal validation status, managed by the school. |
| `observacions_internes` | Internal school observations. |

### `autoritzacions` Rules

- Each submitted form creates exactly one row in `Autoritzacions` -> `autoritzacions`.
- `resposta_id` must be unique.
- `data_hora_enviament` must be generated by the app at submission time.
- `data_hora_enviament` must use ISO8601 format.
- `id_student` must be stored when the form is launched from a workflow that provides the student database identifier.
- `responent_nom_sencer` and `responent_telefon` must be stored for every submitted form response.
- Boolean authorization/declaration fields must be written as real booleans where the sheet supports them.
- `lloc` should be prefilled from the form defaults constant.
- `data_signatura` must be automatically filled from today's date in Apps Script timezone `Europe/Madrid`.
- `signatura_responsable` and `signatura_alumne` must be hidden boolean fields controlled by app logic.
- During the current parent-signature-only testing phase, the app must not automatically write `TRUE` to `signatura_alumne`.
- The form must not store handwritten signature images, Drive file IDs, Drive URLs, or Base64 signature strings in these fields in this version.
- `estat_validacio` and `observacions_internes` are internal school fields and are not entered by the family.
- Existing columns must not be reused later with a different meaning.

## Shared Table: `Autoritzacions` -> `persones_autoritzades`

The logical table `Autoritzacions` contains a sheet named `persones_autoritzades`.

This sheet stores the authorized pickup persons associated with a submitted form response.

Each row represents one authorized person. A single response can have zero, one, or many authorized people.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Unique row identifier for the authorized-person record. |
| `resposta_id` | Foreign key referencing `autoritzacions.resposta_id`. |
| `nom_sencer` | Authorized person's full name. |
| `qualitat_de` | Relationship or role with respect to the student/family. |

### `persones_autoritzades` Rules

- Each authorized pickup person creates one row in `Autoritzacions` -> `persones_autoritzades`.
- `id` must be unique within this sheet.
- `resposta_id` is required for every row.
- Every `persones_autoritzades.resposta_id` must reference an existing `autoritzacions.resposta_id`.
- The app must not create authorized-person rows without the parent authorization response.
- A response may have no authorized-person rows.
- The table must support any number of authorized pickup persons.
- `qualitat_de` stores free text or a selected value describing the relationship.

Common `qualitat_de` examples:

| Value |
| --- |
| `Pare` |
| `Mare` |
| `Avi` |
| `Àvia` |
| `Oncle` |
| `Tieta` |
| `Germà` |
| `Germana` |
| `Cangur` |
| `Familiar` |
| `Tutor legal` |
| `Altre` |

## Shared Table: `Autoritzacions` -> `verification_tokens`

The logical table `Autoritzacions` contains a sheet named `verification_tokens`.

This sheet stores secure launcher verification-token metadata for parent and student access flows.

The sheet must never store the raw token sent by email. It stores only a hash of the token and the metadata needed to validate the request and render the next step.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Unique token record identifier. |
| `created_at` | Token creation datetime in ISO8601 format. |
| `expires_at` | Token expiry datetime in ISO8601 format. |
| `used_at` | Datetime when the token was successfully used. Blank while unused. |
| `token_hash` | Hash of the raw token. The raw token must never be stored. |
| `sender` | Flow type: `parent` or `student`. |
| `email` | Normalized email address used for verification. |
| `dinantia_account_id` | Dinantia account/contact identifier for the verified user when applicable. |
| `student_id` | Student identifier tied to the token when known. |
| `resposta_id` | Authorization response identifier tied to the token when the flow targets an existing response. |
| `status` | Token status: `pending`, `used`, `expired`, or `revoked`. |
| `metadata_json` | JSON object with non-indexed context needed by the flow. |

### `verification_tokens` Rules

- Store only `token_hash`; never store or log the raw token.
- Tokens must expire. Initial recommended lifetime is 30 minutes.
- Preferred behavior is one-time use.
- When a token is consumed successfully, set `used_at` and `status` to `used`.
- Expired tokens should be treated as invalid even if `status` still says `pending`.
- `status = revoked` must always block token use.
- `sender` must be either `parent` or `student`.
- `email` must be normalized by trimming and lowercasing before storage.
- `metadata_json` may include context such as `alumne_nom`, `alumne_document`, `studyType`, `isAdult`, `is14Plus`, selected group name, `dades_alumnes_sheet`, or read-only-mode flags.
- The token record must contain enough context to render the verified next step without trusting editable browser-submitted student data.
- This table is operational security data; it should not be displayed in the tutor panel.

## Shared Table: `Càrrega lectiva` -> `carrecs`

The logical table `Càrrega lectiva` contains a sheet named `carrecs`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `carrec` | Responsibility name used to identify the student's group. |
| `hores lectives` | Not needed by this app. |
| `nom en horaris` | Not needed by this app. |
| `asignado?` | Full name of the teacher responsible for the student's group. |

### `carrecs` Rules

- `carrec` identifies the responsibility/group entry.
- `asignado?` stores the full name of the teacher responsible for the student's group.
- `asignado?` relates to `Dades de professors` -> `Llista` by teacher full name.
- The teacher full name is built from `Llista` as `NOM COGNOM1 COGNOM2`, using a single space as the join string and omitting blank parts.
- `hores lectives` is not used by this app.
- `nom en horaris` is not used by this app.

## Shared Table: `Dinantia` -> `class_groups`

The logical table `Dinantia` contains a sheet named `class_groups`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric field for every row. |
| `dinantia_group_name` | Dinantia group ID used with the Dinantia app. |
| `tutor_carrec` | Responsibility/group name that relates this row to `Càrrega lectiva` -> `carrecs`. |
| `dades_alumnes_sheet` | Sheet name inside `Dades alumnes` containing local student data for this group. |

### `class_groups` Rules

- `id` is an autonumeric row identifier.
- `dinantia_group_name` stores the Dinantia group `id`.
- `tutor_carrec` relates to `Càrrega lectiva` -> `carrecs`.`carrec`.
- `dades_alumnes_sheet` stores the name of the sheet to open inside the logical table `Dades alumnes`.
- `dades_alumnes_sheet` is group-specific and belongs to the same `class_groups` row as the Dinantia group ID in `dinantia_group_name`.
- Dinantia is an ERP software for schools. Integration details are outside the current database structure spec and will be specified separately.

## Shared Table: `Dades alumnes` -> dynamic group sheet

The logical table `Dades alumnes` contains local student data sheets.

The sheet name is not fixed in the connector. It is read from `Dinantia` -> `class_groups`.`dades_alumnes_sheet` for the resolved group.

Rules:

- `Dades alumnes` must be registered in the registry spreadsheet as a logical table.
- The app must open the `Dades alumnes` spreadsheet through the registry.
- The app must then open the sheet whose name is stored in `class_groups.dades_alumnes_sheet`.
- If `dades_alumnes_sheet` is blank, the app must report a clear configuration or tutor-resolution error.
- If the referenced sheet does not exist in `Dades alumnes`, the app must report a clear contextual error.

Required columns in the group-specific sheet:

| Header | Meaning |
| --- | --- |
| `ID` | Dinantia student account ID. |
| `Data Naixement` | Student birthdate shown in the main tutor page. |

Student join rule:

- Dinantia API student account `id` matches `Dades alumnes` group sheet `ID`.
- `Data Naixement` must be read from the matched local row.
- Adult age checks for launcher flows use `Data Naixement` from column/header `Data Naixement` (currently column AA in the sheet layout).
- The student display name still comes from the Dinantia API account `name`.

## Shared Table: `Dinantia` -> `changelog`

The logical table `Dinantia` contains a sheet named `changelog`.

This sheet stores an audit trail for changes made by teachers inside the app.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric value for each changelog row. |
| `datetime` | Date and time when the change was made. |
| `user_mail` | Email of the teacher who made the change. |
| `field_changed` | Controlled field name describing what changed. |
| `old_value` | Value before the change. |
| `new_value` | Value after the change. |
| `student_id` | Dinantia student account ID affected by the change. |

### `changelog` Rules

- Every teacher-made data modification must append one row to `Dinantia` -> `changelog`.
- `datetime` must be written by the app in Apps Script timezone `Europe/Madrid`.
- `user_mail` must come from `Session.getActiveUser().getEmail()`.
- `student_id` must store the affected Dinantia student account `id`.
- `field_changed` must come from a controlled constant/list in app code.
- If a new editable field is unclear during development, ask before adding a new `field_changed` value.
- `old_value` and `new_value` should store the displayed/input value in a stable text form.
- The changelog must be append-only; app features must not edit or delete previous changelog rows.

### Changelog Field Name Registry

The app must maintain a centralized constant/list of allowed `field_changed` values.

Initial known values:

| Field value | Meaning |
| --- | --- |
| `Birthdate` | Student birthdate, sourced from `Dades alumnes`.`Data Naixement`. |
| `Contact{n}Name` | Contact/parent name, where `{n}` is the 1-based contact position for that student. |
| `Contact{n}Phone` | Contact/parent phone, where `{n}` is the 1-based contact position for that student. |
| `Contact{n}Email` | Contact/parent email, where `{n}` is the 1-based contact position for that student. |

Additional values, such as phone or authorization fields, must be added to the controlled list when their editing specs are defined.

## Student Group Tutor Resolution

The app can resolve the teacher responsible for a Dinantia student group through `class_groups`, `carrecs`, and `Llista`.

Resolution process:

1. Start from `Dinantia` -> `class_groups`.
2. Match `class_groups`.`tutor_carrec` to `Càrrega lectiva` -> `carrecs`.`carrec`.
3. Read `carrecs`.`asignado?`.
4. Match `carrecs`.`asignado?` to the teacher full name built from `Dades de professors` -> `Llista` as `NOM COGNOM1 COGNOM2`.
5. Use the matched `Llista` row as the responsible teacher for the student group.
6. Read the resolved `class_groups` row to obtain both:
   - `dinantia_group_name`: Dinantia group ID.
   - `dades_alumnes_sheet`: local `Dades alumnes` sheet name for the group.

String comparisons for `class_groups`.`tutor_carrec` to `carrecs`.`carrec`, and `carrecs`.`asignado?` to teacher full name, should trim surrounding whitespace.

## Teacher Lookup By Email

One app query must find a teacher from `Dades de professors` -> `Llista` using the `CORREU INSTIT` column.

Lookup rules:

- Match the requested email against `CORREU INSTIT`.
- Email matching should trim surrounding whitespace.
- Once the teacher row is found, inspect the `SUBST?` flag.
- If `SUBST?` is not true, use the found teacher row as the teacher.
- If `SUBST?` is true, the found teacher is a substitute and the app must resolve the main teacher they are currently substituting.

### Substitute Email Lookup Resolution

When a teacher found by `CORREU INSTIT` has `SUBST?` true:

1. Read the substitute teacher's `REDUÏT` from `Llista`.
2. Search `Dades de professors` -> `leave_absence` for an active row where `substitute_code` matches that `REDUÏT`.
3. Active means `start_date` is on or before the current date and `end_date` is blank or on or after the current date.
4. The current date is evaluated in the Apps Script timezone `Europe/Madrid`.
5. If an active substitution row is found, use `teacher_code` from that row to find the main teacher in `Llista` by `REDUÏT`.
6. Use the main teacher's information for the app query.
7. If no active substitution row is found, or if the main teacher cannot be resolved, keep using the substitute teacher row that matched `CORREU INSTIT`.

All teacher code comparisons in this process must use `codeKey_`.

## Safety Rules

- Do not hardcode spreadsheet IDs in connector logic.
- Do not hardcode registry mappings in connector logic.
- Do not publish local Apps Script configuration files.
- Do not commit `.clasp.json`.
- Do not commit clasp OAuth credentials.
- Do not read, copy, or publish local clasp credential files such as `~/.clasprc.json`.
