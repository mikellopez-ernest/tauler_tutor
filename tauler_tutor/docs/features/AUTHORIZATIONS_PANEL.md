# Authorizations Panel

This document specifies the `Autoritzacions` section in the tutor dashboard.

This is a specification only. Implementation and deployment require an explicit instruction.

## Purpose

The `Autoritzacions` section gives tutors a read-only overview of the permissions and declarations submitted through the authorization form for the students already loaded in the tutor panel.

The section must answer three questions quickly:

1. Has this student submitted the authorization form?
2. Which relevant permissions are granted or denied?
3. If a required signature is pending, can the tutor send a secure invitation from the panel?

## Navigation

The left menu entry `Autoritzacions` must open this section client-side.

The page must reuse the students already loaded in memory by the tutor endpoint. It must not re-resolve the tutor, reload the Dinantia group, or fetch the student list again.

If the tutor endpoint resolved more than one Dinantia group, the shared `Grups` selector filters this page too. The authorization matrix must show only students in the selected group, or all loaded students when `Tots els grups` is selected.

## Data Source

The section reads the registry-backed table:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Autoritzacions` | `autoritzacions` | Submitted authorization responses. |
| `Autoritzacions` | `verification_tokens` | Operational invitation/token history used to show the latest invitation summary. |

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
- If a student has no matching authorization row, display the row with a pale red background, leave permission cells blank, and show the pending-family invitation action in the status column.
- If a student has one matching authorization row, use that row.
- If a student has multiple matching authorization rows, use the most recent row by `data_hora_enviament`. If that value is missing or invalid, use the last row encountered in sheet order.

## Table Layout

The section should render a read-only matrix with one row per currently loaded student.

The `Autoritzacions` page is read-only and must not show the floating save bubble button used by editable pages such as `Contactes`.

Fixed first columns:

| Column | Source | Behavior |
| --- | --- | --- |
| `Alumne` | Loaded Dinantia student name | Show exactly as already displayed in `Inici`. |
| `Estat formulari` | Matched authorization row and signature fields | Show current status and, when pending, an inline invitation action. |
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

In addition to the native horizontal scrollbar, the page must provide a floating horizontal scrollbar for the authorization matrix. This scrollbar must remain visible near the bottom of the viewport while the tutor is working in `Autoritzacions`, and it must stay synchronized with the actual table scroll position.

### Detail Action

The final column must provide a compact detail action for every student with a submitted authorization row.

| Column | Behavior |
| --- | --- |
| `Detall` | Opens a popup, side panel, or modal with non-boolean details from the matched authorization row. |

The detail action should be disabled or hidden when the student has no matching authorization row.

### Filled Form Document Action

When a student has a submitted authorization row, the student-name cell must show a compact document icon next to the student's name.

Behavior:

- The icon appears only when the student has a filled form.
- The icon opens a window or modal with a read-only version of the submitted form data.
- The read-only view must not allow edits or resubmission.
- The view should organize fields in logical sections, not as an unstructured raw dump.

This action is required. Non-boolean fields must not disappear from the tutor workflow just because the main matrix uses tick/X icons for boolean answers.


## Status And Invitation Actions

The `Estat formulari` column controls panel-initiated invitations.

Status rules:

| Condition | Status text | Inline action |
| --- | --- | --- |
| No matching `autoritzacions` row | `Pendent` | `Enviar a tutors` |
| Parent/responsible signature is not true | `Pendent tutors` | `Enviar a tutors` |
| Parent/responsible signature is true and student signature is not true | `Pendent alumne` | `Enviar a alumne` |
| Parent/responsible signature is true and student signature is true | `Complet` | None |

The inline action must appear behind or beside the status text, not in the `Alumne` column.

Invitation targets:

| Action | Recipients |
| --- | --- |
| `Enviar a tutors` | All loaded Dinantia contacts/parents for that student with a valid email. |
| `Enviar a alumne` | The student email loaded from `Dades alumnes`.`Correu alumne`. |

Panel-initiated invitations must call the deployed `form_launcher_example` endpoint server-side. The tutor panel must not create verification tokens directly; token creation and email delivery belong to the launcher.

The panel must pass the student/form prefill context it already has:

| Field | Source |
| --- | --- |
| `student_id` | Loaded student `id`; launcher forwards this to `auth_form` as `id_student` when applicable. |
| `alumne_nom` | Loaded student visible name. |
| `alumne_document` | Student document value from loaded/local student context when available. |
| `studyType` | Student studies value prepared by `tauler_tutor` from loaded/local student context. |
| `isAdult` | Adult-status value prepared by `tauler_tutor` from loaded/local student context. |
| `is14Plus` | Optional ESO age value prepared by `tauler_tutor` when available. |
| `student_email` | Student email from `Dades alumnes`.`Correu alumne`, required for student invitations. |
| `contacts` | Loaded Dinantia contacts for the student, required for tutor/family invitations. |
| `tutor_email` | `Session.getActiveUser().getEmail()` for audit/context. |

The panel-to-launcher request must include a shared internal secret stored only in script properties. Required script property name: `launcher_internal_secret`. This property must exist in both `tauler_tutor` and `form_launcher_example` with the same value.

The launcher response must be JSON with a summary:

| Field | Meaning |
| --- | --- |
| `ok` | Whether the request was processed. |
| `sent` | Number of emails sent. |
| `skipped` | Number of recipients skipped, for example missing or invalid email. |
| `errors` | Safe error summaries. |

### Bulk Invitation Button

The `Autoritzacions` page must include a floating circular button styled consistently with the `Contactes` save button.

Rules:

- It is visible only in the `Autoritzacions` view.
- It is disabled while sending invitations.
- It has a tooltip/title: `Envia totes les invitacions pendents`.
- Before sending, it must show a confirmation dialog:

```text
S'enviaran invitacions a tots els formularis pendents visibles. Vols continuar?
```

After confirmation, it sends invitations for every visible pending row:

- Parent pending rows use `Enviar a tutors`.
- Student pending rows use `Enviar a alumne`.
- Complete rows are ignored.
- If a group filter is active, only the currently visible group rows are included.

The UI must show a concise Catalan summary of sent, skipped, and failed invitations.

### Invitation Feedback

After pressing an inline invitation action or the bulk button:

| State | Behavior |
| --- | --- |
| Sending | Disable the clicked action/button and show the existing loading overlay. |
| Success | Show a Catalan success summary. |
| Failure | Re-enable the action and show a Catalan error message with safe diagnostic detail. |

The action must not allow duplicate clicks while a request is in progress.

Sending an invitation does not create an authorization response row by itself. The student remains pending until a submitted response appears in `Autoritzacions` -> `autoritzacions` and the authorization data is refreshed.

### Manual Authorization Refresh

The `Autoritzacions` page must include a second floating circular button next to the bulk-invitation button.

Behavior:

- Use a standard update/refresh icon.
- Tooltip: `Actualitza autoritzacions`.
- Visible only while the `Autoritzacions` page is active.
- When clicked, refresh only the authorization read model and reload the authorization table.
- The refresh must rebuild `Dinantia` -> `authorizations_cache` from canonical `Autoritzacions` data.
- The button must be disabled while the refresh is running.

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
- The `Estat formulari` cell must show `Pendent` with the `Enviar a tutors` action.
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

### Latest Invitation In Detail Panel

The detail panel must also show a read-only summary of the latest invitation token record for the student, read from `Autoritzacions` -> `verification_tokens`.

Use the latest row by `created_at` where `verification_tokens.student_id` matches the student `id`.

Fields to show:

| Label | Source |
| --- | --- |
| `Última invitació enviada` | Group heading. |
| `Data` | `created_at`. |
| `Correu` | `email`. |
| `Tipus` | `sender`. |
| `Estat` | `status`. |

If no token row exists for the student, show:

```text
No consta cap invitació enviada.
```

The panel must never display `token_hash` or raw token values.

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
- Create verification tokens directly in `tauler_tutor`.
