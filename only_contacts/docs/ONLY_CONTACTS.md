# Only Contacts Specs

This document will contain the specifications for the `only_contacts` Apps Script project.

## Apps Script Project

| Field | Value |
| --- | --- |
| Folder | `only_contacts/` |
| Apps Script ID | `1oBPSQB3zJrpRHcGpbdeSs04fGjCd8SUGYwn-tASEEsFddlABsOjW4h2X` |
| Web app URL | Public web app URL created manually in Apps Script UI; record here if needed. |
| Latest clasp deployment | `AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @7` |
| Runtime | V8 |
| Time zone | `Europe/Madrid` |
| Execute as | Creator / deploying user |
| Access | Anyone, anonymous |

## Current Status

The Apps Script project has been cloned locally, implemented, pushed with clasp, and synced through deployment `@7`.

## Endpoint Behavior

The app raises a Google Apps Script web app endpoint.

Rules:

- It must be deployed as a web app, not as a library.
- It executes as the creator account, `admindomini@iernestlluch.cat`.
- It is open to anyone with the URL.
- It is read-only.
- It must not expose credentials, script properties, spreadsheet IDs, or cache implementation details in the browser.

Deployment smoke check must confirm that the public URL does not show Google's `Necesitas acceso` / `Necessites accés` page. If clasp creates a non-web-app deployment, create or confirm the web app deployment manually in Apps Script.

## Data Source

For performance, the endpoint reads only from the cache table:

| Logical table | Sheet |
| --- | --- |
| `Dinantia` | `contacts_cache` |

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

The endpoint must not call Dinantia directly. Cache refresh remains the responsibility of the tutor panel cache process.

Group selector source:

- The group combo is generated only from `contacts_cache.group_name` values in the loaded contact rows.
- It represents groups with cached contact rows, not all configured Dinantia groups.
- A group may be absent from the combo if it has no rows in `contacts_cache`, even if it exists in `students_cache`, `dinantia_2_dades_alumnes`, or `teachers_2_dinantia`.
- If the expected group is missing, rebuild the tutor-panel cache and verify that `contacts_cache` contains at least one row with that exact `group_name`.

Implementation rule:

- Use the same `SpreadsheetApp` registry/cache access pattern as `tauler_tutor`.
- Keep the app read-only at the UI and service level: no edit controls, no write endpoints, no Dinantia calls.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

If `db` is missing or blank, the endpoint must return a clear loading error instead of exposing implementation details.

## Diagnostics

The project provides a manual script-editor diagnostic function:

```javascript
diagnoseOnlyContactsSetup()
```

This function is intended for administrators with script-editor access. It may return setup details such as missing script properties, missing registry entries, missing cache sheets, missing headers, or readable row counts.

The public anonymous endpoint must not render raw diagnostic details.

When scopes change, the creator/deployer account must run `authorizeOnlyContactsServices()` once from the Apps Script editor to grant the required script-property and spreadsheet permissions.

The lower-level diagnostic function remains available:

```javascript
diagnoseOnlyContactsSetup()
```


## User Interface

The page title is:

```text
Contacts
```

The page shows a loading overlay with a centered moving icon while data is loading.

After the title, the page shows a filter row:

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

## Performance Rules

- Initial HTML must render quickly.
- Contact data is loaded asynchronously through `google.script.run`.
- The server reads the cache sheet once per request.
- Filtering is client-side over the loaded cached data.
- Data is sorted by group, student, contact position, and contact name.

## Architecture Rules

- Keep this app independent from `tauler_tutor`, `form_launcher_example`, and `auth_form` unless a future spec explicitly defines shared behavior.
- Store detailed specs in this `docs/` folder.
- Keep code and specs in English.
- Keep user-facing UI text in Catalan unless a future spec requires multilingual behavior.
- Never commit `.clasp.json` or any credentials.
