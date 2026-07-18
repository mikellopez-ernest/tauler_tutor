# Tauler Tutor

`tauler_tutor` is a Google Apps Script web app for tutor-facing student group management.

The app resolves the logged-in teacher, finds the tutor group associated with that teacher, loads the group's students from Dinantia, enriches them with local school data, and provides tutor views for group information and contacts.

## Current Status

The app is implemented as a GAS web endpoint and synced with `clasp`.

The current production deployment is updated by redeploying the existing Apps Script deployment ID so the web app URL does not change.

## Repository Context

This app lives inside the parent workspace:

```text
tutor_utils/
  auth_form/
  tauler_tutor/
```

The parent repository is rooted at `tutor_utils`.

Local Apps Script files such as `.clasp.json` are intentionally ignored and must never be committed.

## Main Features

- Domain-restricted GAS endpoint for `iernestlluch.cat` users.
- Execution as the deploying/owner account.
- Logged-in user email resolution through `Session.getActiveUser().getEmail()`.
- Teacher lookup from `Dades de professors -> Llista`.
- Substitute teacher handling through `Dades de professors -> leave_absence`.
- Tutor responsibility lookup through `Càrrega lectiva -> carrecs`.
- Dinantia group lookup through `Dinantia -> class_groups`.
- Student list loaded from the Dinantia API.
- Birthdate enrichment from `Dades alumnes`.
- Dynamic age calculation.
- Sortable student table.
- Contactes page for student contact accounts.
- Autoritzacions page for read-only permission overview and missing-form launch action.
- Contact edit validation before sending updates to Dinantia.
- Changelog entries for saved teacher-made changes.

## Required Script Properties

The deployed Apps Script project requires these script properties:

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |

Missing or blank required properties must produce clear configuration errors.

## Data Sources

The app uses the registry-backed database structure documented in:

```text
docs/DB_STRUCTURE.md
```

Current logical tables include:

| Logical table | Sheets used |
| --- | --- |
| `Dades de professors` | `Llista`, `leave_absence` |
| `Càrrega lectiva` | `carrecs` |
| `Dinantia` | `class_groups`, `changelog` |
| `Dades alumnes` | Dynamic group sheet from `class_groups.dades_alumnes_sheet` |

The connector must not hardcode spreadsheet IDs. Spreadsheet IDs are read from the registry spreadsheet configured by the `db` script property.

## Endpoint Behavior

On access:

1. Render the app shell immediately.
2. Show the loading indicator.
3. Resolve the current user email.
4. Find the teacher in `Dades de professors -> Llista` by `CORREU INSTIT`.
5. If the teacher is a substitute, resolve the main teacher through active `leave_absence` rows.
6. Find the main teacher's tutor responsibility in `Càrrega lectiva -> carrecs`.
7. Map that responsibility to a Dinantia group ID in `Dinantia -> class_groups`.
8. Fetch students in the group from Dinantia.
9. Enrich students with local birthdates from `Dades alumnes`.
10. Fetch contacts for the students.
11. Render the `Inici` page by default.

If the user cannot be mapped to a tutor group, the app shows the configured Catalan tutor error message.

Unexpected/internal errors are shown as `S'ha produït un error` with useful diagnostic information.

## UI

The UI language is Catalan.

Current left menu:

| Entry | Status |
| --- | --- |
| `Inici` | Default page with group title and student table. |
| `Contactes` | Contact editing table. |
| `Autoritzacions` | Read-only permission matrix from submitted authorization forms. |

## Development

Run Apps Script commands from this folder:

```bash
cd tutor_utils/tauler_tutor
```

Useful checks:

```bash
node --check Code.js
node --check WebAppService.js
node --check ContactService.js
node --check DinantiaService.js
```

Client inline script parse check:

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('Client.html','utf8'); const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(!m) throw new Error('No script tag'); new Function(m[1]); console.log('client script ok');"
```

Sync to Apps Script:

```bash
clasp push -f
```

Deploy only when explicitly requested.

## Documentation

Detailed specs live in `docs/`.

Key files:

| Path | Purpose |
| --- | --- |
| `docs/PROJECT.md` | Architecture and documentation conventions. |
| `docs/DB_STRUCTURE.md` | Registry, tables, headers, and relationships. |
| `docs/features/TUTOR_GROUP_ENDPOINT.md` | Tutor endpoint behavior. |
| `docs/features/AUTHORIZATIONS_PANEL.md` | Authorization permission matrix behavior. |
| `../form_launcher_example/docs/FORM_LAUNCHER_ENDPOINT.md` | Temporary form-launch tunnel behavior. |
| `docs/DINANTIA_API_NOTES.md` | Dinantia API notes. |
| `docs/Dinantia-API-Documentation/` | Local Dinantia API documentation snapshot. |

## Security Notes

- Do not commit `.clasp.json`.
- Do not commit clasp credentials.
- Do not place Dinantia credentials in source files.
- Keep Dinantia credentials in Apps Script properties only.
- Treat student, teacher, contact, and health-related data as sensitive school data.
