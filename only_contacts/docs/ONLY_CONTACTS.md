# Tauler Professors Read-Only Specs

This document specifies the `tauler_professors_read_only` Apps Script project.

The local folder remains `only_contacts/` for repository stability. The Apps Script project name is `tauler_professors_read_only`.

## Apps Script Project

| Field | Value |
| --- | --- |
| Folder | `only_contacts/` |
| Apps Script project name | `tauler_professors_read_only` |
| Apps Script ID | `1oBPSQB3zJrpRHcGpbdeSs04fGjCd8SUGYwn-tASEEsFddlABsOjW4h2X` |
| Web app URL | `https://script.google.com/macros/s/AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX/exec` |
| Latest clasp deployment | `AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @16` |
| Runtime | V8 |
| Time zone | `Europe/Madrid` |
| Execute as | Creator / deploying user |
| Access | Anyone, anonymous |

## Current Status

The Apps Script project has been cloned locally, implemented, pushed with clasp, and synced through deployment `@16`.

## Endpoint Behavior

The app raises a Google Apps Script web app endpoint.

Current implementation scope: read-only teacher panel with three views: `Llistats`, `Contactes`, and `Autoritzacions`.

The app mirrors the broad structure of `tauler_tutor`, but removes every modification capability.

Rules:

- It must be deployed as a web app, not as a library.
- It executes as the creator account, `admindomini@iernestlluch.cat`.
- It is open to anyone with the URL.
- It is read-only.
- It must not expose credentials, script properties, spreadsheet IDs, or cache implementation details in the browser.
- It must not identify or filter by the current user. Everyone with the URL sees the same data.

Deployment smoke check must confirm that the public URL does not show Google's `Necesitas acceso` / `Necessites accés` page. If clasp creates a non-web-app deployment, create or confirm the web app deployment manually in Apps Script.

## Data Source

For performance, the endpoint reads from cache tables whenever possible:

| Logical table | Sheet |
| --- | --- |
| `Dinantia` | `dinantia_groups` |
| `Dinantia` | `students_cache` |
| `Dinantia` | `contacts_cache` |
| `Dinantia` | `authorizations_cache` |

`Llistats` may call the Dinantia API only when the selected group has no direct result in `students_cache`.

### `dinantia_groups`

Required headers:

| Header | Meaning |
| --- | --- |
| `id` | Dinantia group ID, used internally. |
| `name` | Visible group name, used in the combo. |
| `parent_id` | Parent Dinantia group ID. |
| `level` | Tree level computed by `cacheRebuildDinantiaGroups()`. |
| `path_names` | Full group path for stable sorting. |
| `sort_order` | Discovery order from Dinantia. |
| `active` | Only active groups are shown. |

The `Llistats` group combo:

- Shows level-1 roots `ESO`, `PFI`, `BAT`, and `CIC`, in that exact order.
- Shows each root and all its descendants.
- Displays every hierarchy level with a clear visual indentation marker.
- Displays `name`.
- Uses `id` internally.
- Does not include descendants when a parent group is selected.
- If a selected group has no direct students, the table is empty.

### `students_cache`

Required headers:

| Header | Meaning |
| --- | --- |
| `student_id` | Student Dinantia/account ID. |
| `student_name` | Visible student full name. |
| `student_email` | Student email when cached. |
| `group_name` | Cached student group. |
| `birthdate` | Birthdate when cached. |
| `age` | Age when cached. |
| `document` | Student document when cached. |
| `study_type` | Student study type when cached. |
| `is_adult` | Adult flag used by authorization status logic. |
| `is_14_plus` | 14-plus flag used by authorization status logic. |

### `contacts_cache`

Required headers:

| Header | Meaning |
| --- | --- |
| `student_id` | Student Dinantia/account ID. |
| `student_name` | Visible student full name. |
| `group_name` | Student group. |
| `contact_id` | Contact Dinantia/account ID. |
| `contact_position` | Contact ordering for the student. |
| `contact_name` | Contact full name. |
| `contact_email` | Contact email. |
| `contact_phone` | Contact phone. |
| `contact_source` | Contact origin. Current values are `dinantia` and `authorization_emergency`. Blank legacy values are treated as `dinantia`. |

The `Contactes` endpoint must not call Dinantia directly. Cache refresh remains the responsibility of the tutor panel cache process.

Contact-source rules:

- `dinantia` rows represent parent/contact accounts from Dinantia.
- `authorization_emergency` rows represent emergency contacts submitted through `auth_form`.
- Emergency rows are read from `contacts_cache` exactly like any other row, but the UI should show a small `Emergència` badge/icon next to the contact name.
- Emergency rows have no email value unless a future database field is added, so the email cell should show `-`.
- The endpoint stays read-only for every source.

Group selector source:

- The group combo is generated only from `contacts_cache.group_name` values in the loaded contact rows.
- It represents groups with cached contact rows, not all configured Dinantia groups.
- A group may be absent from the combo if it has no rows in `contacts_cache`, even if it exists in `students_cache`, `dinantia_2_dades_alumnes`, or `teachers_2_dinantia`.
- If the expected group is missing, rebuild the tutor-panel cache and verify that `contacts_cache` contains at least one row with that exact `group_name`.

Implementation rules:

- Use the same `SpreadsheetApp` registry/cache access pattern as `tauler_tutor`.
- Keep the app read-only at the UI and service level: no edit controls, no write endpoints.
- Only `Llistats` may call Dinantia directly, and only as a read-only fallback when the selected group has no direct students in `students_cache`.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

If `db` is missing or blank, the endpoint must return a clear loading error instead of exposing implementation details.

## Diagnostics

The project provides a manual script-editor diagnostic function:

```javascript
diagnoseTaulerProfessorsReadOnlySetup()
```

`diagnoseOnlyContactsSetup()` remains as a compatibility wrapper.

This diagnostic function is intended for administrators with script-editor access. It may return setup details such as missing script properties, missing registry entries, missing cache sheets, missing headers, or readable row counts.

The public anonymous endpoint must not render raw diagnostic details.

When scopes change, the creator/deployer account must run `authorizeTaulerProfessorsReadOnlyServices()` once from the Apps Script editor to grant the required script-property and spreadsheet permissions.

`authorizeOnlyContactsServices()` remains as a compatibility wrapper.

The lower-level diagnostic function remains available:

```javascript
diagnoseTaulerProfessorsReadOnlySetup()
```


### `authorizations_cache`

The `Autoritzacions` view reads students from `students_cache` and authorizations/invitation summaries from `authorizations_cache`.

Rules:

- Use the same status logic as `tauler_tutor`.
- Show the same authorization columns as `tauler_tutor`.
- Show group and status filters.
- Do not show delete/invalidate actions.
- Do not show family/student invitation actions.
- Do not send emails.
- Do not create print tokens.
- The detail popup is read-only.
- The floating XLSX export button exports only the rows currently visible after filters.
- The authorization table should allow horizontal scrolling and size columns from their content instead of forcing narrow wrapped cells.
- The XLSX export includes both the visible matrix values and related detail fields used by the detail popup, including emergency contact, academic communication contact, health/medication details, external platform text, submit/update metadata, and authorized pickup people in separate dynamic columns.

## User Interface

The page title is:

```text
Alumnes
```

The page shows a loading overlay with a centered moving icon while data is loading.

Left menu:

| Label | Behavior |
| --- | --- |
| `Llistats` | Shows selected group students. |
| `Contactes` | Shows read-only contact rows. |
| `Autoritzacions` | Shows read-only authorization matrix. |

### Llistats

The page shows a tree-like group selector backed by `dinantia_groups`.

The group selector must show the complete hierarchy under the configured roots. Each level must be visibly indented with a marker so users can distinguish parent groups from child groups at a glance.

The table columns are:

| Column | Source |
| --- | --- |
| `Grup` | Selected group ID/name from cache/API result. |
| `Nom sencer` | Student full name. |

Students must be sorted by full name.

The view includes a bottom-right floating XLSX export button. It exports only the currently visible student rows with `grup` and `nom_sencer` columns.

### Contactes

The page shows the current contact filter row:

| Control | Behavior |
| --- | --- |
| Student textbox | Searches students by approximate/accent-insensitive name match. |
| `OK` button | Applies the student textbox search. |
| Group combo | Lists all `group_name` values present in the loaded `contacts_cache` rows. Default is `Tots els grups`. |
| Reset button | Clears the student textbox and resets the group combo to `Tots els grups`. |

The table columns are:

| Column | Source |
| --- | --- |
| `Grup` | `contacts_cache.group_name` |
| `Alumne` | `contacts_cache.student_name` |
| `Nom` | `contacts_cache.contact_name` |
| `Email` | `contacts_cache.contact_email` |
| `Telèfon` | `contacts_cache.contact_phone` |

The table follows the visual logic of the `Contactes` page in `tauler_tutor`, but all fields are plain read-only text.

Rows are grouped by student. Group and student cells may use row spans when a student has more than one contact.

Rows where `contact_source = authorization_emergency` must show the emergency badge/icon next to the contact name.

### Autoritzacions

The page shows filters equivalent to the tutor panel authorization page, plus the same student-name textbox filter pattern used by `Contactes`:

| Control | Behavior |
| --- | --- |
| Student textbox | Searches students by approximate/accent-insensitive name match. |
| `OK` button | Applies the student textbox search. |
| Group combo | Lists all `group_name` values present in the loaded authorization students. Default is `Tots els grups`. |
| Status combo | Filters by authorization status. Default is `Tots els estats`. |
| Reset button | Clears the student textbox and resets group/status filters to their defaults. |

The table shows the same informational columns as `tauler_tutor`:

- Student, group, status, date, detail.
- Exit permissions.
- Communication permissions.
- Image/publication permissions.
- Work/publication/preservation permissions.
- Health permissions.
- Document/policy acknowledgements.
- Responsible/student signatures.

The table is read-only and has no invite, invalidate, delete, save, or edit controls.

The bottom-right floating XLSX export button exports only the currently visible rows after all filters. The exported spreadsheet must always include the core visible columns `alumne`, `grup`, `estat`, and `data`.

Beyond those core columns, the export must include every authorization/cache field that has at least one answered value in the visible rows. Columns that are blank for every visible student must be omitted.

Answered values include both positive and negative answers, such as `Si` and `No`. Only empty values count as unanswered.

Authorization XLSX columns must follow the same order as the on-screen authorization table. The spreadsheet uses two header rows:

- Row 1 contains merged category headers such as `Dades`, `Sortides`, `Comunicacions`, `Imatge i publicació`, `Obres`, `Salut`, `Documents`, `Signatura`, and `Enviament`.
- Row 2 contains the individual permission/detail names such as `Surt sol/a`, `Esbarjo`, `Municipi`, or `Emergència telèfon`.

Categories must only span columns that survived the non-empty-column filtering.

The exported spreadsheet should therefore include, whenever at least one visible row has data:

- Matrix/status columns visible in the table.
- `emergencia_nom`, `emergencia_telefon`, and `emergencia_relacio`.
- `acad_contacte_nom`, `acad_contacte_email`, and `acad_contacte_relacio`.
- `problemes_salut`, `altres_salut`, `medicacio`, `posologia`, and `dosi`.
- `plataformes_externes`.
- `submitted_by_email`, `updated_at`, and `updated_by_email`.
- One pair of dynamic columns for each authorized pickup person: `persona_autoritzada_N_nom` and `persona_autoritzada_N_relacio`.

### XLSX Export Pipeline

The browser calls `createReadOnlyXlsx(payload)` through `google.script.run` with the rows currently visible on screen.

The backend:

- Builds a two-dimensional table in memory.
- Creates a temporary Google Spreadsheet in Drive.
- Writes values and basic formatting into the temporary sheet.
- Flushes spreadsheet changes.
- Exports the temporary spreadsheet as XLSX through the Drive export endpoint using `ScriptApp.getOAuthToken()`.
- Returns `{ fileName, mimeType, base64 }` to the browser.
- Trashes the temporary spreadsheet in a `finally` block.

The browser receives the base64 XLSX and triggers a download with a temporary `<a>` link.

The export button must use the Bootstrap `bi-file-earmark-spreadsheet` icon inline in the button, centered vertically and horizontally by CSS.

If Drive/XLSX scopes need to be granted manually, run this function from the Apps Script editor:

```javascript
authorizeTaulerProfessorsReadOnlyExportServices()
```

## Performance Rules

- Initial HTML must render quickly.
- Data is loaded asynchronously through `google.script.run`.
- `Llistats` loads students only after a group is selected.
- `Contactes` data is loaded only when opening the `Contactes` view.
- `Autoritzacions` data is loaded only when opening the `Autoritzacions` view.
- Filtering is client-side over the loaded cached data.
- Data is sorted by group, student, contact position, and contact name.
- XLSX export receives only currently visible rows from the client, so filters are applied before backend export.

## Architecture Rules

- Keep this app independent from `tauler_tutor`, `form_launcher_example`, and `auth_form` unless a future spec explicitly defines shared behavior.
- Store detailed specs in this `docs/` folder.
- Keep code and specs in English.
- Keep user-facing UI text in Catalan unless a future spec requires multilingual behavior.
- Never commit `.clasp.json` or any credentials.
