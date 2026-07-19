# Tutor Utils

Parent repository for the school tutor utilities Apps Script system.

This repo contains three related GAS web apps that share the same registry-backed database model:

| Folder | Purpose |
| --- | --- |
| `tauler_tutor/` | Domain-restricted tutor panel for teachers. |
| `form_launcher_example/` | Public launcher and verification gateway for authorization forms. |
| `auth_form/` | Public multilingual authorization form endpoint. |

## Local Structure

```text
tutor_utils/
  .gitignore
  PENDING_DEVELOPMENTS.local.md
  auth_form/
  form_launcher_example/
  tauler_tutor/
```

The parent git repository is rooted at `tutor_utils`.

Each GAS app keeps its own clasp project files inside its folder. Run `clasp` commands from the specific app folder you want to sync or deploy.

## Security

Never commit:

- `.clasp.json`
- clasp credentials
- Apps Script script properties
- Dinantia API credentials
- launcher shared secrets
- local planning notes

The root `.gitignore` intentionally ignores `.clasp.json` at every level.

## Shared Database Model

All apps use the `db` Apps Script property to open the registry spreadsheet.

The registry spreadsheet maps logical table names to spreadsheet IDs. Specs for the shared structure live mainly in:

```text
tauler_tutor/docs/DB_STRUCTURE.md
```

## Apps

### Tauler Tutor

Run from:

```bash
cd tauler_tutor
```

Main deployment:

```text
https://script.google.com/a/macros/iernestlluch.cat/s/AKfycbwOcqce-v40j7kv1wVuhnERUtdup3GMZhdCHXnN-vP_CqlycQl_ttjaClbzQqUxSq3Leg/exec
```

### Form Launcher

Run from:

```bash
cd form_launcher_example
```

Main deployment:

```text
https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec
```

Useful entry points:

```text
?sender=parent
?sender=student
```

### Auth Form

Run from:

```bash
cd auth_form
```

Main deployment:

```text
https://script.google.com/macros/s/AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg/exec
```

## Operational Notes

- Cache tables are read models, not canonical data.
- Writes must go to the canonical origin first, then refresh the affected cache.
- `rebuildTutorPanelCache()` is the nightly cache rebuild function in `tauler_tutor`.
- `authorizeServices()` should be run manually from Apps Script after scopes or spreadsheet access paths change.
