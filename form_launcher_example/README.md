# Form Launcher

Public Google Apps Script launcher and verification gateway for the authorization form.

The launcher is the security bridge between public users, the tutor panel, and `auth_form`. It verifies email ownership, creates short-lived server-side tokens, sends invitation emails, and forwards verified users to the form with trusted POST data.

## Deployment

Current web app:

```text
https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec
```

Apps Script settings:

| Setting | Value |
| --- | --- |
| Execute as | Deploying user / owner |
| Access | Anyone, including anonymous |
| Runtime | V8 |
| Time zone | `Europe/Madrid` |

The endpoint is public by design. It must not expose student/form data before verification.

Redeploy with the existing deployment ID unless a new URL is explicitly requested.

```bash
clasp push
clasp deploy -i AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg -d "Description"
```

## Public Entry Points

| URL shape | Behavior |
| --- | --- |
| `/exec` | Shows role choice. |
| `/exec?sender=parent` | Starts family/legal guardian email verification. |
| `/exec?sender=student` | Starts student email and group verification. |
| `/exec?token=...` | Resolves a secure token and continues to the appropriate verified flow. |

## Tutor Panel Entry Points

The tutor panel calls the launcher server-side with the shared `launcher_internal_secret`.

| Action | Purpose |
| --- | --- |
| `panel_invite` | Create parent/student verification tokens and send invitation emails. |
| `panel_print_link` | Create a short-lived tutor print/review link for a submitted form. |

The tutor panel must not create verification tokens directly.

## Security Model

The launcher stores token metadata in:

```text
Autoritzacions -> verification_tokens
```

Rules:

- Store only `token_hash`; never store the raw token.
- Token lifetime is currently 24 hours.
- The token is tied to sender type, email, Dinantia account ID when available, student ID, response ID when available, and `metadata_json`.
- User-facing errors must not mention internal token terminology.
- Raw tokens, token hashes, API credentials, script properties, and internal secrets must never be logged or rendered.

## Parent Flow

1. Parent opens `?sender=parent`.
2. Parent enters email.
3. Launcher searches the email in Dinantia.
4. If not found, show a safe Catalan not-registered message.
5. If found, resolve associated students through Dinantia parent-child relations.
6. If more than one eligible minor student exists, the verified flow asks which student to open.
7. Launcher sends a personal verification email.
8. Parent opens token link.
9. Launcher resolves the token and forwards trusted context to `auth_form`.

If an active response already exists:

- The original respondent can edit the same row.
- Other parents see the same form in read-only mode.

If the student is 18 or older, the parent flow must not open the form; the student must fill it themselves.

## Student Flow

1. Student opens `?sender=student`.
2. Student enters `@iernestlluch.cat` email and selects their group.
3. Group options are loaded from `Dinantia -> dinantia_2_dades_alumnes`.
4. Launcher checks `Dades alumnes` for the selected group and `Correu alumne`.
5. If the student is 18 or older, the launcher sends a self-submission invitation.
6. If the student is 14+ and a parent form exists, the launcher sends a read-only confirmation invitation.
7. If a parent form is still missing for a minor student, show a Catalan message asking them to ask their family to fill it first.

## Performance Rules

Opening a token link must feel fast.

Current approach:

- `GET ?token=...` renders a tiny loading shell immediately.
- The shell resolves the token asynchronously with `google.script.run`.
- The token-opening path must not perform sheet-wide maintenance.
- Do not expire every old token during token validation.
- Do not rebuild caches during token opening.
- Panel-created tokens should already contain normalized student context from the tutor-panel cache. Reuse it instead of reopening `Dades alumnes`.

The final POST bridge to `auth_form` is a transport layer, not a user-facing step:

- It renders minimal HTML.
- It submits to `auth_form` immediately.
- It shows no visible content in the normal path.
- It reveals an `Obrint el formulari...` fallback with a manual button only if navigation does not happen quickly.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |
| `launcher_internal_secret` | Shared secret for trusted calls from `tauler_tutor`. |

## File Map

| File | Responsibility |
| --- | --- |
| `Código.js` | Main launcher logic, entry points, verification flows, token handling, email sending, form forwarding. |
| `Config.js` | Endpoint URLs, property names, Dinantia base URL, support email, token lifetime. |
| `Index.html` | Minimal placeholder for Apps Script project structure. |
| `appsscript.json` | Apps Script runtime, web app, and OAuth scopes. |
| `docs/FORM_LAUNCHER_ENDPOINT.md` | Full launcher specification. |

## Development Checks

Run from this folder:

```bash
node --check --input-type=commonjs < Código.js
```

Sync:

```bash
clasp push
```

Deploy:

```bash
clasp deploy -i AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg -d "Description"
```

## Documentation

Detailed specs live in:

```text
docs/FORM_LAUNCHER_ENDPOINT.md
```

Related specs:

```text
../auth_form/docs/FORM_GAS_ENDPOINT.md
../tauler_tutor/docs/DB_STRUCTURE.md
../tauler_tutor/docs/features/AUTHORIZATIONS_PANEL.md
```

## Security

- Do not commit `.clasp.json`.
- Do not hardcode script properties or credentials.
- Do not log raw tokens, token hashes, secrets, or full private payloads.
- Keep public pages generic until the email-token check succeeds.
- Treat `metadata_json` as sensitive operational data; use only what is needed to render the next verified step.
