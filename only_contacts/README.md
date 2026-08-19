# Tauler Professors Read-Only

Google Apps Script project for the `tauler_professors_read_only` app.

The local folder is still named `only_contacts/` for repository stability. The Apps Script project name is `tauler_professors_read_only`.

This folder is connected to Apps Script project:

```text
1oBPSQB3zJrpRHcGpbdeSs04fGjCd8SUGYwn-tASEEsFddlABsOjW4h2X
```

Latest synced clasp deployment:

```text
AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @16
```

Deployment note: create or confirm the public web app deployment in the Apps Script UI with:

- Type: `Web app`
- Execute as: `Me / creator`
- Access: `Anyone`

Public web app URL:

```text
https://script.google.com/macros/s/AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX/exec
```

## Purpose

This app exposes a public read-only teacher-facing endpoint.

The web app executes as the creator account and is accessible to anyone with the URL. It renders a read-only panel with the same broad structure as `tauler_tutor`.

The app uses the same `SpreadsheetApp` registry/cache access pattern as `tauler_tutor`. The endpoint is read-only at the application level: it renders data as plain text/icons and exposes no editing, deletion, invalidation, invitation, or write actions.

Views:

| View | Data source | Behavior |
| --- | --- | --- |
| `Llistats` | `Dinantia -> dinantia_groups`, `students_cache` when possible, Dinantia API fallback when needed | Shows selected group students with `Grup` and `Nom sencer`. |
| `Contactes` | `Dinantia -> contacts_cache` | Shows the existing read-only contact table. |
| `Autoritzacions` | `Dinantia -> students_cache`, `authorizations_cache` | Shows the authorization matrix and filters, without tutor actions. |

`Llistats` uses the Dinantia group discovery table for its combo. The visible level-1 groups are `ESO`, `PFI`, `BAT`, and `CIC`, in that order, with the full hierarchy of descendants underneath. Each level is visually indented with a clear marker. Selecting a group shows only students directly belonging to that group; descendant groups are not included automatically.

`Llistats` includes a floating XLSX export button for the currently visible student list.

`Autoritzacions` includes a student-name textbox filter and reset button equivalent to `Contactes`. It also includes a floating XLSX export button that exports only the currently visible filtered rows. The export always keeps core visible columns and includes every authorization field that has at least one answered value among the visible rows, including related detail fields such as emergency contact, health information, academic contact, external platforms, submit/update metadata, and authorized pickup people.

Authorization XLSX exports use two header rows: merged category headers on top and individual permission/detail names below. Columns follow the on-screen authorization order and blank-for-everyone fields are omitted.

XLSX exports are generated server-side through a temporary Google Spreadsheet, Drive XLSX export, base64 return to the browser, and temporary-file trash cleanup.

`Llistats` uses `Dinantia -> dinantia_groups` for its hierarchical selector. `Contactes` uses the loaded `Dinantia -> contacts_cache`.`group_name` values, so the contacts group selector shows groups that currently have cached contact rows.

## Structure

```text
only_contacts/
  README.md
  docs/
    ONLY_CONTACTS.md
  appsscript.json
  Code.js
  Config.js
  Database.js
  Index.html
  Styles.html
  Client.html
```

## Security

Do not commit `.clasp.json`, Apps Script credentials, script properties, Dinantia credentials, launcher secrets, verification tokens, or any other private operational data.

The root `.gitignore` already ignores `.clasp.json` at every level.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user, used only for `Llistats` fallback when a selected group is not available in `students_cache`. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret, used only for `Llistats` fallback when a selected group is not available in `students_cache`. |

## Export Permissions

XLSX export requires Drive access because the backend creates a temporary Google Spreadsheet, exports it as XLSX through Drive, and trashes the temporary file.

If Google asks for additional authorization after deployment, run:

```javascript
authorizeTaulerProfessorsReadOnlyExportServices()
```

This helper creates a tiny temporary spreadsheet, exports it as XLSX through Drive, and trashes the temporary file. It exists only to grant and verify export permissions.

## Development

Run clasp commands from this folder:

```bash
cd only_contacts
clasp push
```

Deploy only when explicitly requested.

If scopes change, open the Apps Script editor and run `authorizeTaulerProfessorsReadOnlyServices()` once manually to grant the new permissions for the creator/deployer account.

The preferred current helper name is:

```javascript
authorizeTaulerProfessorsReadOnlyServices()
```

`authorizeOnlyContactsServices()` remains as a compatibility wrapper.

Latest synced clasp deployment:

```text
AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @16
```

## Diagnostics

If the public page cannot load contacts, run this function manually from the Apps Script editor:

```javascript
authorizeTaulerProfessorsReadOnlyServices()
```

It checks whether `db` exists, the registry is readable, `Dinantia` is registered, `contacts_cache` exists, required headers are present, and how many cache rows are readable.

For a diagnostic report without the authorization-oriented wrapper, run:

```javascript
diagnoseTaulerProfessorsReadOnlySetup()
```

`diagnoseOnlyContactsSetup()` remains as a compatibility wrapper.
