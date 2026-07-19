# Project Notes

This repository is currently in specification mode.

## Documentation Layout

All project documentation and app specifications must live inside `docs/`.

Suggested structure:

| Path | Purpose |
| --- | --- |
| `docs/DB_STRUCTURE.md` | Registry, shared tables, joins, and database rules. |
| `docs/PROJECT.md` | Project-level notes and architecture conventions. |
| `docs/features/` | Feature-specific app specs. |
| `docs/api/` | Endpoint and request/response specs. |
| `docs/security/` | Security, permissions, credentials, and data-handling specs. |

Current feature specs:

| Path | Purpose |
| --- | --- |
| `docs/features/TUTOR_GROUP_ENDPOINT.md` | GAS tutor endpoint that resolves the current user to a Dinantia group and lists students. |
| `docs/features/AUTHORIZATIONS_PANEL.md` | Read-only authorization permission matrix for the tutor dashboard. |

## Architecture Principles

- Keep database access registry-driven.
- Keep logical table names separate from spreadsheet IDs.
- Keep reusable connector behavior separate from feature-specific query rules.
- Prefer small feature specs over one large mixed document when the app grows.
- Treat credentials and local tool configuration as non-documentation and non-source artifacts.
- Do not commit `.clasp.json` or clasp credential files.
- Keep expensive external API calls out of initial page load where possible. Load secondary data such as contacts only when the user opens the relevant view or triggers an action that needs it.

## Logging

The app must keep safe structured logs for resolver and loading failures.

Rules:

- Use JSON structured console logs so entries are searchable in Apps Script / Cloud Logging.
- Log resolver stages such as teacher match, responsibility match, group mapping, student loading, and final failure.
- Never log secrets, raw tokens, token hashes, passwords, clasp credentials, or script property values.
- Redact fields whose names contain `secret`, `token`, or `password`.
- Keep user-facing errors friendly, but log internal diagnostics for administrators/developers.
- Tutor-resolution failures may still show the generic Catalan tutor message in the UI.

## Visible Debug Mode

The tutor panel may expose a restricted diagnostic mode through:

```text
?debug=1
```

Rules:

- The endpoint must still require a valid logged-in `@iernestlluch.cat` user.
- Debug mode is intended for resolver troubleshooting when Apps Script execution logs are not accessible.
- Normal users without the query parameter see the regular friendly error page.
- If initial tutor resolution fails, debug mode may show:
  - current user email,
  - registry table names,
  - resolver stage statuses,
  - normalized join keys,
  - matching rows and sample available rows,
  - missing group/sheet mappings.
- Debug mode must never show script property values, credentials, raw tokens, token hashes, clasp credentials, or other secrets.
- Debug details must be built from the same resolver helpers and sanitized through the logging sanitizer.
