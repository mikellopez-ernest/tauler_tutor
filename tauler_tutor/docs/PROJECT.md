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
