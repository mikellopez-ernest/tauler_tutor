# Authorizations Panel

This document specifies the `Autoritzacions` section in the tutor dashboard.

This is a specification only. Do not implement, deploy, or sync from this document without an explicit later instruction.

## Purpose

The `Autoritzacions` section gives tutors a read-only overview of the permissions and declarations submitted through the authorization form for the students already loaded in the tutor panel.

The section must answer three questions quickly:

1. Has this student submitted the authorization form?
2. Which relevant permissions are granted or denied?
3. If the form is missing, can the tutor launch the form request for that student?

## Navigation

The left menu entry `Autoritzacions` must open this section client-side.

The page must reuse the students already loaded in memory by the tutor endpoint. It must not re-resolve the tutor, reload the Dinantia group, or fetch the student list again.

## Data Source

The section reads the registry-backed table:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Autoritzacions` | `autoritzacions` | Submitted authorization responses. |

Required headers from `Autoritzacions` -> `autoritzacions`:

| Header | Meaning |
| --- | --- |
| `id_student` | Student identifier used to match the row to the currently loaded students. |
| `resposta_id` | Unique form response identifier. |
| `data_hora_enviament` | Submission datetime. |
| `data_signatura` | Signature/submission date. |

The permission fields are listed in the table sections below.

## Student Matching

The app must match currently loaded students to authorization rows by student ID:

| Tutor student value | Authorization value |
| --- | --- |
| Student `id` already loaded in memory | `autoritzacions.id_student` |

Rules:

- Compare IDs as trimmed strings.
- Do not perform name-based matching.
- Do not load students again for this section.
- If a student has no matching authorization row, display the row with a pale red background, leave permission cells blank, and show the launch button beside the student name.
- If a student has one matching authorization row, use that row.
- If a student has multiple matching authorization rows, use the most recent row by `data_hora_enviament`. If that value is missing or invalid, use the last row encountered in sheet order.

## Table Layout

The section should render a read-only matrix with one row per currently loaded student.

The `Autoritzacions` page is read-only and must not show the floating save bubble button used by editable pages such as `Contactes`.

Fixed first columns:

| Column | Source | Behavior |
| --- | --- | --- |
| `Alumne` | Loaded Dinantia student name | Show exactly as already displayed in `Inici`; when missing authorization, show a rocket launch button to the left of the name. |
| `Estat formulari` | Matched authorization row exists | Show submitted/missing status. |
| `Data` | `data_hora_enviament` preferred, fallback `data_signatura` | Show compact date. |

Permission columns must be grouped logically.

### Group: `Sortides`

| Column label | Source field |
| --- | --- |
| `Surt sol/a` | `sortida_sola` |
| `Esbarjo` | `sortida_esbarjo` |
| `Sortides municipi` | `sortides_municipi` |

### Group: `Comunicacions`

| Column label | Source field |
| --- | --- |
| `Comunicació acadèmica` | `comunicacio_academica` |
| `Comunicació salut` | `comunicacio_salut` |
| `Plataformes digitals` | `declaracio_plataformes` |

### Group: `Imatge i publicació`

| Column label | Source field |
| --- | --- |
| `Intranet` | `imatge_intranet` |
| `Web` | `imatge_web` |
| `Plataformes externes` | `imatge_externa` |

### Group: `Obres`

| Column label | Source field |
| --- | --- |
| `Obra oberta` | `obra_oberta` |
| `Espais centre` | `obra_centre` |
| `Biblioteca` | `obra_biblioteca` |
| `Repositori` | `obra_repositori` |

### Group: `Salut`

| Column label | Source field / rule |
| --- | --- |
| `Medicació` | `administracio_medicacio` |
| `Paracetamol` | `paracetamol` |
| `Info salut` | Derived true when `problemes_salut` or `altres_salut` is not blank. |

### Group: `Signatura`

| Column label | Source field |
| --- | --- |
| `Responsable` | `signatura_responsable` |
| `Alumne/a` | `signatura_alumne` |

### Horizontal Overflow

The authorization matrix can contain more columns than fit on screen. The page must provide a visible horizontal scrollbar or equivalent horizontal scrolling container so tutors can move through all permission columns without losing access to the student names.

The first student-identification columns should remain easy to track while scrolling horizontally. A sticky first column is preferred if it fits the implementation cleanly.

### Detail Action

The final column must provide a compact detail action for every student with a submitted authorization row.

| Column | Behavior |
| --- | --- |
| `Detall` | Opens a popup, side panel, or modal with non-boolean details from the matched authorization row. |

The detail action should be disabled or hidden when the student has no matching authorization row.

This action is required. Non-boolean fields must not disappear from the tutor workflow just because the main matrix uses tick/X icons for boolean answers.


## Missing Form Launch Action

When a student has no matching row in `Autoritzacions` -> `autoritzacions`, the `Alumne` cell must include a launch button to the left of the student's name.

Button rules:

| Element | Requirement |
| --- | --- |
| Icon | Small rocket icon. |
| Position | Left of the student name. |
| Visibility | Only shown when the student has no authorization row. |
| Tooltip / accessible label | Catalan text indicating that it launches or sends the authorization form. |
| Enabled state | Enabled only when the app has enough student/contact data to launch the form. |

Target production behavior:

- Pressing the rocket button sends an email to all contacts for that student.
- The email contains or launches the authorization form for the selected student.
- The form launch must include the student context required by `auth_form`, including `id_student` and the POST prefill fields already specified there.

Current development/testing behavior:

- Pressing the rocket button must call the deployed GAS endpoint/project `form_launcher_example`: `https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec`.
- `form_launcher_example` is a temporary/testing launcher used to define and validate the launch flow before implementing the final email behavior.
- The current testing launcher deployment is public and may be accessed without a signed-in email; the launcher must therefore remain stateless and must not persist personal data.
- The tutor panel must treat the launcher call as an action for one specific student, not for the whole group.

Minimum data to pass to the launcher:

| Field | Source |
| --- | --- |
| `student_id` | Loaded student `id`; launcher forwards this to `auth_form` as `id_student`. |
| `alumne_nom` | Loaded student visible name. |
| `alumne_document` | Student document value from loaded/local student context when available. |
| `studyType` | Student studies value prepared by `tauler_tutor` from loaded/local student context. |
| `isAdult` | Adult-status value prepared by `tauler_tutor` from loaded/local student context. |
| `is14Plus` | Optional ESO age value prepared by `tauler_tutor` when available. |
| `contact_name` | First loaded contact name for the student. |
| `contact_phone` | First loaded contact phone for the student. |
| `contact_email` | First loaded contact email for the student. |
| `tutor_email` | `Session.getActiveUser().getEmail()` or current loaded user context. |

For performance, `tauler_tutor` should send the form prefill fields it already knows instead of making `auth_form` look them up later by `student_id`.

During testing, only the first contact is sent to `form_launcher_example`. Production email behavior will later target all student contacts.

### Launch Feedback

After pressing the rocket button, the UI must give clear feedback:

| State | Behavior |
| --- | --- |
| Launching | Disable the clicked button and show a small loading indicator. |
| Success | Show a Catalan success message for that student. |
| Failure | Re-enable the button and show a Catalan error message with safe diagnostic detail. |

The button must not allow duplicate clicks while the launch request is in progress.

### Launch Scope

Launching a form request does not create an authorization response row by itself.

The student should remain in the missing-form state until a submitted response appears in `Autoritzacions` -> `autoritzacions` and the authorization data is refreshed.

## Icon Rules

Permission cells use icons, not text, for fast scanning.

| Value | Display |
| --- | --- |
| Granted / true | Tick icon. |
| Denied / false | Red X icon. |
| Blank / not applicable | Empty muted dash or blank cell. |
| No form row | Blank cell; the full row already indicates missing form. |

Boolean parsing must reuse the same normalization rules as the form persistence specs:

- Real boolean `true` means granted.
- String `TRUE` means granted.
- `si`, `sí`, `true`, and `1` mean granted if those values appear in the sheet.
- Real boolean `false`, string `FALSE`, `no`, `false`, and `0` mean denied.
- Blank means not applicable or unknown.

## Missing Form Styling

When no authorization row exists for a student:

- The full row background must be pale red.
- `Estat formulari` should clearly indicate that the form is missing.
- The `Alumne` cell must show the rocket launch button to the left of the student name.
- Permission cells should show nothing, not red X icons.

Reason: a red X means a submitted response denied a permission; a missing form means no answer exists.

## Detail Panel

Long text and contextual fields must not be placed directly in the matrix.

The detail panel/modal should show non-boolean fields from the matched authorization row, grouped for readability.

Suggested fields:

| Group | Fields |
| --- | --- |
| Submission | `resposta_id`, `data_hora_enviament`, `idioma_formulari`, `codi_document`, `tipus_alumne`. |
| Academic contact | `acad_contacte_nom`, `acad_contacte_email`, `acad_contacte_relacio`. |
| Emergency contact | `emergencia_nom`, `emergencia_telefon`, `emergencia_relacio`. |
| Health | `problemes_salut`, `altres_salut`, `medicacio`, `posologia`, `dosi`. |
| Publication detail | `plataformes_externes`. |
| Internal | `estat_validacio`, `observacions_internes`. |

The detail panel is read-only in this version.

## Sorting

Initial order must match the already-loaded student list order used in `Inici`.

The table should support sorting by:

| Sort key | Behavior |
| --- | --- |
| `Alumne` | Sort by visible student name. |
| `Estat formulari` | Group missing forms together. |
| `Data` | Sort by latest/oldest submission date. |

Sorting the authorization table must not mutate the original in-memory student list used by other pages.

## Loading Behavior

Authorization data may be loaded after the initial student list is already in memory.

If loading happens when the user opens `Autoritzacions`, show the existing loading indicator while reading `Autoritzacions` -> `autoritzacions`.

The app may cache the loaded authorization rows for the current session. If a refresh action is added later, it should reload only authorization data, not the student list.

## Error Handling

If the authorization table cannot be loaded, the section must show a clear Catalan error message in the `Autoritzacions` page without breaking the already-loaded `Inici` and `Contactes` pages.

Examples:

- Missing registry entry for `Autoritzacions`.
- Missing sheet `autoritzacions`.
- Missing required headers.
- Spreadsheet access error.

## Out Of Scope For Current Version

This section does not:

- Edit authorization responses.
- Write changelog entries.
- Read `persones_autoritzades` directly.
- Generate PDFs.
- Contact Dinantia.
