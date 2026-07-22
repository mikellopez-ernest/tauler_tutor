# Auth Form

Public multilingual Google Apps Script endpoint for school authorization, declaration, and communication forms.

The form is opened through the launcher after email-token verification. It renders the authorization model that corresponds to the student, pre-fills trusted student/respondent data, validates required fields, persists the response, and refreshes the tutor-panel authorization cache.

## Deployment

Current web app:

```text
https://script.google.com/macros/s/AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg/exec
```

Apps Script settings:

| Setting | Value |
| --- | --- |
| Execute as | Deploying user / owner |
| Access | Anyone, including anonymous |
| Runtime | V8 |
| Time zone | `Europe/Madrid` |

The endpoint is public because families may access it from outside the school domain. Public access is protected by launcher-issued tokens and server-side validation.

Redeploy with the existing deployment ID unless a new URL is explicitly requested.

```bash
clasp push
clasp deploy -i AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg -d "Description"
```

## Core Responsibilities

- Render the authorization form in multiple languages.
- Accept verified POST context from `form_launcher_example`.
- Validate launcher tokens before loading protected existing responses or saving.
- Pre-fill school constants, student data, and verified respondent/contact data.
- Persist form submissions to canonical `Autoritzacions` sheets.
- Update the verified Dinantia contact when respondent contact data changes.
- Refresh `Dinantia -> authorizations_cache` after canonical writes.
- Render read-only/printable form views using the same UI as the editable form.
- Allow 14+ student confirmation and adult-student self-submission flows.

## Form Modes

| Mode | Meaning |
| --- | --- |
| `new_parent` | Parent/legal guardian fills a new form for a minor student. |
| `new_student_adult` | Adult student fills and signs their own form. |
| `edit_owner` | Original respondent reopens and edits their existing response. |
| `readonly` | Non-owner respondent views an existing response with disabled controls. |
| `readonly_print` | Tutor opens a printable read-only version from the panel. |
| `student_confirm` | 14+ student reviews a submitted form and confirms conformity. |

Protected modes require a valid launcher token. The public endpoint must not trust a naked `resposta_id`.

## User Experience

The form renders a fast client shell first when protected data needs to be resolved. The shell shows a centered loading indicator while token validation and initial data loading happen asynchronously.

After successful submission, the user sees the success message and is redirected to:

```text
https://agora.xtec.cat/sesernestlluch-cunit/
```

## Languages

The UI supports:

| Code | Language |
| --- | --- |
| `ca` | Catalan |
| `es` | Spanish |
| `en` | English |
| `ru` | Russian |
| `uk` | Ukrainian |
| `ar` | Arabic, RTL |

Catalan is the canonical source language. Translation keys must exist in every `Translations_*.html` file, including `Translations_TEMPLATE.html`.

When adding or changing visible form text:

1. Update the Catalan source text.
2. Add/update the same key in every translation file.
3. Keep `Translations_TEMPLATE.html` synchronized.
4. Verify that dynamic text created by `App.html` also has translation keys.

## Data Persistence

Canonical tables:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Autoritzacions` | `autoritzacions` | One row per submitted form response. |
| `Autoritzacions` | `persones_autoritzades` | Authorized pickup people linked by `resposta_id`. |
| `Autoritzacions` | `verification_tokens` | Launcher token metadata used for protected access. |

Read-through/write-through cache:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Dinantia` | `authorizations_cache` | Latest active authorization row and latest invitation summary per student. |
| `Dinantia` | `contacts_cache` | Contact cache updated when verified respondent data changes. |

Canonical writes happen first. Cache refresh happens only after the canonical write succeeds.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |

## File Map

| File | Responsibility |
| --- | --- |
| `Code.gs` | `doGet`, `doPost`, rendering, token-protected initial-data resolution. |
| `Database.gs` | Persistence, token validation, cache refresh, Dinantia contact update. |
| `Config.gs` | Constants, registry sheet names, endpoint URLs. |
| `Index.html` | Form markup and structure. |
| `App.html` | Browser-side behavior, validation, filling, read-only modes, submit flow. |
| `Styles.html` | Form styles and loading overlay. |
| `I18n.html` | Translation runtime. |
| `Translations_*.html` | Translation catalogues. |

## Development Checks

Run from this folder:

```bash
node --check --input-type=commonjs < Code.gs
node --check --input-type=commonjs < Database.gs
```

Client script parse check:

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('App.html','utf8'); const script=html.replace(/^\\s*<script>\\s*/,'').replace(/\\s*<\\/script>\\s*$/,''); new Function(script); console.log('client script ok');"
```

## Documentation

Detailed specs live in:

```text
docs/FORM_GAS_ENDPOINT.md
```

Related specs:

```text
../form_launcher_example/docs/FORM_LAUNCHER_ENDPOINT.md
../tauler_tutor/docs/DB_STRUCTURE.md
```

## Security

- Do not persist raw launcher tokens.
- Do not expose token hashes or script properties to the browser.
- Validate the launcher token again on save, not only on initial render.
- Keep Dinantia credentials in Apps Script properties only.
- Treat health, identity, contact, and authorization answers as sensitive student data.
