# Tutor Utils

Google Apps Script workspace for the Institut Ernest Lluch tutor utilities system.

This repository contains three coordinated GAS web apps. They share a registry-backed database model, but each app has its own Apps Script project, clasp configuration, deployment, and security boundary.

## Apps

| Folder | App | Audience | Access | Purpose |
| --- | --- | --- | --- | --- |
| `tauler_tutor/` | Tutor panel | Teachers | Domain users only | Resolve the logged-in teacher, show their students, edit contacts, and manage authorization workflows. |
| `form_launcher_example/` | Form launcher | Families, students, tutor panel | Public endpoint | Verify identity, create secure tokens, send invitation emails, and forward verified users to the form. |
| `auth_form/` | Authorization form | Families and students | Public endpoint | Render the multilingual form, persist submissions, and refresh authorization cache data. |

## Current URLs

| App | URL |
| --- | --- |
| Tutor panel | `https://script.google.com/a/macros/iernestlluch.cat/s/AKfycbwOcqce-v40j7kv1wVuhnERUtdup3GMZhdCHXnN-vP_CqlycQl_ttjaClbzQqUxSq3Leg/exec` |
| Launcher | `https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec` |
| Auth form | `https://script.google.com/macros/s/AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg/exec` |

Useful launcher entry points:

```text
https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec?sender=parent
https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec?sender=student
```

## Workspace Layout

```text
tutor_utils/
  README.md
  PENDING_DEVELOPMENTS.local.md
  auth_form/
  form_launcher_example/
  tauler_tutor/
```

The git repository is rooted at `tutor_utils`.

Run `clasp` commands from the specific app folder you want to sync or deploy.

## Data Model

Every app reads the Apps Script property `db`, which points to the database registry spreadsheet.

The registry spreadsheet contains a `tables` sheet that maps logical table names to spreadsheet IDs. The apps must not hardcode spreadsheet IDs in source.

Primary data/spec documentation:

| Path | Purpose |
| --- | --- |
| `tauler_tutor/docs/DB_STRUCTURE.md` | Shared registry, logical tables, sheets, headers, relationships, and cache rules. |
| `tauler_tutor/docs/features/TUTOR_GROUP_ENDPOINT.md` | Tutor panel endpoint behavior. |
| `tauler_tutor/docs/features/AUTHORIZATIONS_PANEL.md` | Authorization panel behavior. |
| `form_launcher_example/docs/FORM_LAUNCHER_ENDPOINT.md` | Launcher identity, token, email, and forwarding behavior. |
| `auth_form/docs/FORM_GAS_ENDPOINT.md` | Form rendering, validation, persistence, and cache write-through behavior. |

## Security Rules

Never commit credentials or local Apps Script connection files.

Ignored/sensitive material includes:

- `.clasp.json`
- clasp credentials
- Apps Script script properties
- Dinantia API credentials
- launcher shared secrets
- raw verification tokens or token hashes
- local planning notes in `PENDING_DEVELOPMENTS.local.md`

The root `.gitignore` intentionally ignores `.clasp.json` at every level.

## Required Script Properties

| Property | Apps | Meaning |
| --- | --- | --- |
| `db` | All apps | Spreadsheet ID of the registry spreadsheet. |
| `dinantia_api_user` | `tauler_tutor`, `form_launcher_example`, `auth_form` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | `tauler_tutor`, `form_launcher_example`, `auth_form` | Dinantia API Basic Auth secret. |
| `launcher_internal_secret` | `tauler_tutor`, `form_launcher_example` | Shared high-entropy secret for trusted panel-to-launcher calls. |

Missing properties must fail with clear configuration errors.

## Operational Model

- Canonical writes go to the source table first.
- Cache tables are read models and may be overwritten.
- After a canonical authorization write, refresh `Dinantia -> authorizations_cache` immediately.
- After contact edits, write Dinantia first, then update `Dinantia -> contacts_cache`.
- Nightly cache rebuild function: `rebuildTutorPanelCache()` in `tauler_tutor`.
- Manual authorization/scope helper: `authorizeServices()`.

## Development

Examples:

```bash
cd tauler_tutor
clasp push
```

```bash
cd form_launcher_example
clasp push
```

```bash
cd auth_form
clasp push
```

Deploy only when explicitly requested, and reuse the existing deployment ID unless the user asks for a new deployment.

## Local Notes

`PENDING_DEVELOPMENTS.local.md` is for local planning only. Keep it ignored and out of git.

Documentation and specs belong in each app's `docs/` folder. Top-level documentation should describe the whole workspace, not detailed feature behavior.
