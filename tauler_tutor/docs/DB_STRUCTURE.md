# Database Structure

This document describes the database structure used by the app. The app must treat database locations as configurable data, not as hardcoded connector configuration.

## Script Properties

The Apps Script project must define these script properties.

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |
| `launcher_internal_secret` | Shared secret used for trusted server-to-server invitation requests from `tauler_tutor` to `form_launcher_example`. |

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
| `Dinantia` | `dinantia_2_dades_alumnes`, `teachers_2_dinantia`, `changelog`, `students_cache`, `contacts_cache`, `authorizations_cache`, `cache_runs` |
| `Dades alumnes` | Group-specific student sheets referenced by `Dinantia` -> `dinantia_2_dades_alumnes`.`dades_alumnes_sheet` |
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
- `Dinantia` -> `dinantia_2_dades_alumnes`
- `Dinantia` -> `teachers_2_dinantia`
- `Dinantia` -> `changelog`
- `Dinantia` -> `students_cache`
- `Dinantia` -> `contacts_cache`
- `Dinantia` -> `authorizations_cache`
- `Dinantia` -> `cache_runs`
- `Dades alumnes` -> dynamic sheet name from `dinantia_2_dades_alumnes.dades_alumnes_sheet`
- `Autoritzacions` -> `autoritzacions`
- `Autoritzacions` -> `persones_autoritzades`
- `Autoritzacions` -> `verification_tokens`

Relationships:

| From | To | Rule |
| --- | --- | --- |
| `leave_absence.teacher_code` | `Llista.REDUÏT` | Original teacher on leave. |
| `leave_absence.substitute_code` | `Llista.REDUÏT` | Substitute teacher covering the leave. |
| `carrecs.asignado?` | `Llista` full name | Teacher assigned to the responsibility. Full name is `NOM COGNOM1 COGNOM2`, omitting blanks. A teacher may appear in more than one row. |
| `teachers_2_dinantia.carrec` | `carrecs.carrec` | Teacher responsibility maps to one or more visible Dinantia groups. |
| `teachers_2_dinantia.dinantia_group_names` | `dinantia_2_dades_alumnes.dinantia_group_name` | Comma-separated list of Dinantia groups visible for that responsibility. |
| `dinantia_2_dades_alumnes.dades_alumnes_sheet` | `Dades alumnes` sheet name | Local student-data sheet for the resolved group. |
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

Commitment and mobile policy headers:

| Header | Meaning |
| --- | --- |
| `carta_compromis_acceptada` | Boolean acknowledgement that the respondent has read and accepts the educational commitment letter. Required and always `TRUE` for new submissions. |
| `consentiment_mobil` | Boolean consent for the student to bring a mobile phone to school under the centre rules. `TRUE` means consent is given; `FALSE` means consent is refused. |

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
| `submitted_by_dinantia_account_id` | Dinantia account ID of the first verified respondent that submitted the row. |
| `submitted_by_email` | Normalized email of the first verified respondent that submitted the row. |
| `updated_at` | Datetime of the latest edit to the row. |
| `updated_by_email` | Normalized email of the verified respondent that last edited the row. |
| `student_confirmed_at` | Datetime when the student confirmed the already submitted form. |
| `student_confirmed_email` | Normalized student email used for confirmation. |
| `invalidated` | Boolean flag set by the tutor panel when the submitted form must stop being considered active. |
| `invalidated_at` | Datetime when the form was invalidated. |
| `invalidated_by_email` | Tutor email that invalidated the form. |
| `invalidated_reason` | Tutor-entered reason for the invalidation. |

### `autoritzacions` Rules

- The first submitted form for a student creates one row in `Autoritzacions` -> `autoritzacions`.
- If the original verified respondent reopens the form, edits must update the same `resposta_id` row instead of appending a new row.
- Other verified parent/contact accounts for the same student must see the submitted form in read-only mode.
- `resposta_id` must be unique.
- `data_hora_enviament` must be generated by the app at submission time.
- `data_hora_enviament` must use ISO8601 format.
- `data_hora_enviament`, `submitted_by_dinantia_account_id`, and `submitted_by_email` identify the original submission and must be preserved on later edits.
- `updated_at` and `updated_by_email` must be refreshed when an existing response is edited.
- `id_student` must be stored when the form is launched from a workflow that provides the student database identifier.
- `responent_nom_sencer` and `responent_telefon` must be stored for every submitted form response.
- Boolean authorization/declaration fields must be written as real booleans where the sheet supports them.
- `lloc` should be prefilled from the form defaults constant.
- `data_signatura` must be automatically filled from today's date in Apps Script timezone `Europe/Madrid`.
- `signatura_responsable` and `signatura_alumne` must be hidden boolean fields controlled by app logic.
- Parent/legal-guardian submissions must not automatically write `TRUE` to `signatura_alumne`.
- Adult-student submissions may write `TRUE` to `signatura_alumne` because the adult student is the respondent.
- Minor student confirmation must update only `signatura_alumne`, plus `student_confirmed_at` and `student_confirmed_email` when present.
- Parent edits after student confirmation must not silently clear `signatura_alumne` or the student confirmation audit fields.
- Invalidating a response must set `invalidated` to real boolean `TRUE` and write `invalidated_at`, `invalidated_by_email`, and `invalidated_reason`.
- Invalidated rows must remain in the canonical sheet for audit/history, but app read models must treat them as inactive for current status resolution.
- After invalidation, the student behaves as if no active authorization response exists, so the tutor can send a new invitation.
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
| `sender` | Flow type: `parent`, `student`, or `tutor_print`. |
| `email` | Normalized email address used for verification. |
| `dinantia_account_id` | Dinantia account/contact identifier for the verified user when applicable. |
| `student_id` | Student identifier tied to the token when known. |
| `resposta_id` | Authorization response identifier tied to the token when the flow targets an existing response. |
| `status` | Token status: `pending`, `used`, `expired`, or `revoked`. |
| `metadata_json` | JSON object with non-indexed context needed by the flow. |

### `verification_tokens` Rules

- Store only `token_hash`; never store or log the raw token.
- Tokens must expire. Current lifetime is 24 hours.
- Preferred behavior is one-time use.
- When a token is consumed successfully, set `used_at` and `status` to `used`.
- Expired tokens should be treated as invalid even if `status` still says `pending`.
- Full expired-token cleanup must not run during user-facing token navigation. `GET ?token=...`, token validation, and form-forwarding POSTs must only inspect the current token row and, when that current row is expired, update only that row. Sheet-wide cleanup belongs in token creation, scheduled maintenance, or explicit admin/cache jobs.
- Expired or already-used token errors must be shown with friendly Catalan messages that do not mention internal token terminology.
- `status = revoked` must always block token use.
- `sender` must be `parent`, `student`, or `tutor_print`.
- `email` must be normalized by trimming and lowercasing before storage.
- `metadata_json` may include context such as `alumne_nom`, `alumne_document`, `studyType`, `isAdult`, `is14Plus`, selected group name, `dades_alumnes_sheet`, read-only-mode flags, or short-lived tutor print payloads.
- The token record must contain enough context to render the verified next step without trusting editable browser-submitted student data.
- Panel-created invitation tokens should include normalized student context from the tutor-panel cache. The launcher should reuse that trusted metadata and avoid reopening `Dades alumnes` during token opening unless the metadata is incomplete.
- This table is operational security data. The tutor panel may show only non-sensitive invitation summaries such as latest `created_at`, `email`, `sender`, and `status`.
- The tutor panel must never display `token_hash`, raw token values, or full `metadata_json`.

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
- A teacher may have multiple responsibilities. Resolver logic must collect every `carrecs` row whose `asignado?` matches the teacher full name, not only the first match.
- Not every responsibility must have a row in `teachers_2_dinantia`. Responsibilities without a Dinantia mapping are ignored for panel visibility.
- The resolver fails only when none of the teacher's matched responsibilities maps to any Dinantia group.
- The teacher full name is built from `Llista` as `NOM COGNOM1 COGNOM2`, using a single space as the join string and omitting blank parts.
- `hores lectives` is not used by this app.
- `nom en horaris` is not used by this app.

## Shared Table: `Dinantia` -> `dinantia_2_dades_alumnes`

The logical table `Dinantia` contains a sheet named `dinantia_2_dades_alumnes`.

This sheet maps each Dinantia group to the local `Dades alumnes` sheet that contains data not available in Dinantia.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric field for every row. |
| `dinantia_group_name` | Dinantia group name/id used by the app. |
| `dades_alumnes_sheet` | Sheet name inside `Dades alumnes` containing local student data for this group. |

### `dinantia_2_dades_alumnes` Rules

- `id` is an autonumeric row identifier.
- `dinantia_group_name` stores the Dinantia group value used for API membership matching.
- `dades_alumnes_sheet` stores the sheet name to open inside the logical table `Dades alumnes`.
- Every group referenced by `teachers_2_dinantia.dinantia_group_names` must have a matching row here.
- Missing mappings must produce a clear configuration error.

## Shared Table: `Dinantia` -> `teachers_2_dinantia`

The logical table `Dinantia` contains a sheet named `teachers_2_dinantia`.

This sheet maps a teaching responsibility to one or more visible Dinantia groups.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric field for every row. |
| `carrec` | Responsibility name from `Càrrega lectiva` -> `carrecs`.`carrec`. |
| `dinantia_group_names` | Comma-separated Dinantia group names/ids visible for this responsibility. |

### `teachers_2_dinantia` Rules

- `carrec` joins to `Càrrega lectiva` -> `carrecs`.`carrec`.
- `dinantia_group_names` may contain one or many groups.
- Parse `dinantia_group_names` by comma.
- Trim spaces around each group value.
- Ignore empty chunks.
- Preserve the listed order unless a UI sort explicitly changes display order.
- Each parsed group must exist in `Dinantia` -> `dinantia_2_dades_alumnes`.

## Cache Tables

The tutor panel uses cache tables as a fast read model.

Cache tables are not the canonical database. The canonical sources remain Dinantia, `Dades alumnes`, `Càrrega lectiva`, `Dades de professors`, and `Autoritzacions`.

### Cache Write Policy

Editable data must follow this order:

1. Validate the submitted value.
2. Write to the canonical origin first.
3. If the origin write succeeds, update the affected cache row.
4. Append the changelog row when the field is audited.
5. If the cache update fails after the origin write succeeds, do not roll back the origin write. Log the cache error and let the next nightly rebuild repair the read model.

The panel must never persist user edits only in cache.

### Nightly Rebuild

The cache rebuild function is:

```javascript
rebuildTutorPanelCache()
```

This function is designed to be attached manually to a nightly Apps Script time trigger.

The rebuild process must:

1. Read every row from `Dinantia` -> `dinantia_2_dades_alumnes`.
2. Fetch Dinantia accounts once.
3. Build all cached student rows by matching Dinantia student group membership to each mapped group.
4. Enrich students from the mapped `Dades alumnes` sheet using `ID`.
5. Build all cached contact rows from each student's Dinantia parent account IDs.
6. Build the authorization cache from `Autoritzacions` -> `autoritzacions` and latest token summaries from `Autoritzacions` -> `verification_tokens`.
7. Completely overwrite the current cache tables, preserving row 1 headers.
8. Append one historical run row to `Dinantia` -> `cache_runs`.

Only `cache_runs` keeps history. The other cache sheets are fully replaced on every successful rebuild.

### `Dinantia` -> `students_cache`

This sheet stores one cached row per student per Dinantia group.

Required headers:

| Header | Meaning |
| --- | --- |
| `student_id` | Dinantia student account ID. |
| `student_name` | Dinantia student display name. |
| `student_email` | Student email from `Dades alumnes`.`Correu alumne`. |
| `group_name` | Dinantia group name/id. |
| `student_data_sheet` | Source sheet in `Dades alumnes`. |
| `parent_ids` | JSON array of Dinantia parent/contact account IDs. |
| `birthdate` | Display birthdate from `Dades alumnes`.`Data Naixement`. |
| `birthdate_sort_key` | ISO date text (`yyyy-MM-dd`) used for sorting. Cache writers must preserve it as plain text so Sheets does not convert it to a localized date display. |
| `age` | Full years calculated against today in `Europe/Madrid`. |
| `document` | Student identity document when available. |
| `study_type` | Inferred study type used by the authorization form. `BAT` maps to `batx`; `FP`, `CF`, `CICLE`, `PFI`, `SMX`, `PCC`, and `AC` map to `fp`; otherwise the default is `eso`. |
| `is_adult` | `si` when age is 18 or more, otherwise `no`. |
| `is_14_plus` | `si` when age is 14 or more, otherwise `no`. |

### `Dinantia` -> `contacts_cache`

This sheet stores one cached row per student contact.

Required headers:

| Header | Meaning |
| --- | --- |
| `student_id` | Dinantia student account ID. |
| `student_name` | Dinantia student display name. |
| `group_name` | Dinantia group name/id. |
| `contact_id` | Dinantia parent/contact account ID. |
| `contact_position` | 1-based position in the student's parent list. |
| `contact_name` | Contact display name. |
| `contact_email` | Contact email. |
| `contact_phone` | Contact phone. |

Contact edits must be written to Dinantia first. After a successful Dinantia update, update every `contacts_cache` row with the same `contact_id`.

Reason: the same Dinantia parent/contact account can appear in multiple rows when siblings are loaded. `contacts_cache` is a denormalized read model, so updates must fan out by `contact_id` and must not be limited to the student row where the edit happened.

### `Dinantia` -> `authorizations_cache`

This sheet stores the latest authorization row per student, plus latest invitation summary columns.

Required authorization headers are the same fields rendered by the tutor panel from `Autoritzacions` -> `autoritzacions`, including:

```text
id_student, resposta_id, data_hora_enviament, data_signatura, idioma_formulari,
codi_document, tipus_alumne, sortida_sola, sortida_esbarjo, sortides_municipi,
comunicacio_academica, comunicacio_salut, declaracio_plataformes,
imatge_intranet, imatge_web, imatge_externa, obra_oberta, obra_centre,
obra_biblioteca, obra_repositori, administracio_medicacio, paracetamol,
carta_compromis_acceptada, consentiment_mobil,
problemes_salut, altres_salut, signatura_responsable, signatura_alumne,
acad_contacte_nom, acad_contacte_email, acad_contacte_relacio,
emergencia_nom, emergencia_telefon, emergencia_relacio, medicacio,
posologia, dosi, plataformes_externes, estat_validacio, observacions_internes
authorized_people_json
```

`authorized_people_json` stores a JSON array built from `Autoritzacions` -> `persones_autoritzades` for the active `resposta_id`. Each item contains:

| Key | Meaning |
| --- | --- |
| `nom_sencer` | Authorized pickup person's full name. |
| `qualitat_de` | Relationship/role with respect to the student/family. |

Required latest-invitation headers:

| Header | Meaning |
| --- | --- |
| `latest_invitation_created_at` | Latest token creation datetime for this student. |
| `latest_invitation_expires_at` | Latest token expiry datetime. |
| `latest_invitation_used_at` | Latest token used datetime, when used. |
| `latest_invitation_sender` | `parent` or `student`. |
| `latest_invitation_email` | Recipient email for the latest invitation. |
| `latest_invitation_resposta_id` | Related authorization response ID, when available. |
| `latest_invitation_status` | Latest token status. |

When the panel sends invitations through the launcher, the app should refresh `authorizations_cache` after successful sends so the latest invitation shown in the detail popup is current.

When the authorization form writes a new row to `Autoritzacions` -> `autoritzacions`, it must refresh `authorizations_cache` immediately after the canonical write succeeds.

When a student confirmation changes `Autoritzacions` -> `autoritzacions.signatura_alumne`, the launcher must refresh `authorizations_cache` immediately after the canonical write succeeds.

### `Dinantia` -> `cache_runs`

This sheet stores one historical row per cache rebuild attempt.

Required headers:

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric run ID. |
| `started_at` | Rebuild start datetime. |
| `finished_at` | Rebuild finish datetime. |
| `status` | `ok` or `error`. |
| `students_count` | Number of rows written to `students_cache`. |
| `contacts_count` | Number of rows written to `contacts_cache`. |
| `authorizations_count` | Number of rows written to `authorizations_cache`. |
| `message` | Success or error summary. |

## Shared Table: `Dades alumnes` -> dynamic group sheet

The logical table `Dades alumnes` contains local student data sheets.

The sheet name is not fixed in the connector. It is read from `Dinantia` -> `dinantia_2_dades_alumnes`.`dades_alumnes_sheet` for the resolved group.

Rules:

- `Dades alumnes` must be registered in the registry spreadsheet as a logical table.
- The app must open the `Dades alumnes` spreadsheet through the registry.
- The app must then open the sheet whose name is stored in `dinantia_2_dades_alumnes.dades_alumnes_sheet`.
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

The app can resolve the Dinantia groups visible to a teacher through `teachers_2_dinantia`, `dinantia_2_dades_alumnes`, `carrecs`, and `Llista`.

Resolution process:

1. Match `carrecs`.`asignado?` to the teacher full name built from `Dades de professors` -> `Llista` as `NOM COGNOM1 COGNOM2`.
2. Collect every matching `carrecs` row.
3. Read `carrecs`.`carrec` from every matching row.
4. Match each `carrecs`.`carrec` to `Dinantia` -> `teachers_2_dinantia`.`carrec` when such a row exists.
5. Ignore matched responsibilities that do not have a `teachers_2_dinantia` row.
6. Fail only if none of the teacher's responsibilities has a Dinantia mapping.
7. Parse each matched `teachers_2_dinantia`.`dinantia_group_names` into one or more Dinantia group names.
8. Merge groups from all mapped responsibilities, removing duplicates while preserving first-seen order.
9. For each group name, match `Dinantia` -> `dinantia_2_dades_alumnes`.`dinantia_group_name`.
10. Read `dinantia_2_dades_alumnes`.`dades_alumnes_sheet` for the group.

String comparisons for `teachers_2_dinantia`.`carrec` to `carrecs`.`carrec`, and `carrecs`.`asignado?` to teacher full name, should trim surrounding whitespace.

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
