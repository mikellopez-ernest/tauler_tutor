# Tauler Tutor

Tutor-facing Google Apps Script web app for teachers at Institut Ernest Lluch.

The panel resolves the logged-in teacher, finds every mapped responsibility for that teacher, loads the visible Dinantia groups from cache, and provides three tutor workflows: students, contacts, and authorizations.

## Deployment

Current web app:

```text
https://script.google.com/a/macros/iernestlluch.cat/s/AKfycbwOcqce-v40j7kv1wVuhnERUtdup3GMZhdCHXnN-vP_CqlycQl_ttjaClbzQqUxSq3Leg/exec
```

Apps Script settings:

| Setting | Value |
| --- | --- |
| Execute as | Deploying user / owner |
| Access | Domain users |
| Runtime | V8 |
| Time zone | `Europe/Madrid` |

Redeploy with the existing deployment ID unless a new URL is explicitly requested.

```bash
clasp push
clasp deploy -i AKfycbwOcqce-v40j7kv1wVuhnERUtdup3GMZhdCHXnN-vP_CqlycQl_ttjaClbzQqUxSq3Leg -d "Description"
```

## What It Does

| View | Purpose |
| --- | --- |
| `Inici` | Student list, birthdate, and age for the teacher's visible groups. |
| `Contactes` | Editable Dinantia contact data with validation and changelog tracking. |
| `Autoritzacions` | Permission matrix, invitation actions, read-only printable form view, and invalidation workflow. |

The UI language is Catalan.

Source code and specs are written in English unless they represent user-facing text.

## User Resolution Flow

On initial load, the app:

1. Renders the shell and centered loading indicator.
2. Reads `Session.getActiveUser().getEmail()`.
3. Resolves the teacher in `Dades de professors -> Llista` using `CORREU INSTIT`.
4. If needed, resolves active substitution through `Dades de professors -> leave_absence`.
5. Finds every matching responsibility in `Càrrega lectiva -> carrecs`.
6. Maps responsibilities to visible Dinantia groups through `Dinantia -> teachers_2_dinantia`.
7. Validates groups through `Dinantia -> dinantia_2_dades_alumnes`.
8. Loads students from `Dinantia -> students_cache`.
9. Loads contacts and authorizations lazily/cache-backed as needed.

If no mapped group exists, the app shows the configured Catalan "no tutoring" message.

Unexpected errors show `S'ha produït un error` with safe diagnostic detail.

## Data Sources

All spreadsheet IDs come from the registry spreadsheet configured by the `db` script property.

| Logical table | Sheets used by this app |
| --- | --- |
| `Dades de professors` | `Llista`, `leave_absence` |
| `Càrrega lectiva` | `carrecs` |
| `Dinantia` | `dinantia_2_dades_alumnes`, `teachers_2_dinantia`, `students_cache`, `contacts_cache`, `authorizations_cache`, `cache_runs`, `changelog` |
| `Dades alumnes` | Dynamic group sheet used during cache rebuilds. |
| `Autoritzacions` | `autoritzacions`, `persones_autoritzades`, `verification_tokens` |

Detailed data rules live in [docs/DB_STRUCTURE.md](/Users/mikellopez/Documents/Codex/tutor_utils/tauler_tutor/docs/DB_STRUCTURE.md).

## Cache Model

The panel is optimized to read from cache tables:

| Cache | Purpose |
| --- | --- |
| `Dinantia -> students_cache` | Student identity, group, birthdate, age, document, study model flags. |
| `Dinantia -> contacts_cache` | Dinantia parent/contact rows grouped by student. |
| `Dinantia -> authorizations_cache` | Latest active authorization row and latest invitation summary per student. |
| `Dinantia -> cache_runs` | Historical cache rebuild attempts. |

Nightly rebuild function:

```javascript
rebuildTutorPanelCache()
```

Cache tables are read models. Canonical writes must happen first in the origin system, then the affected cache is refreshed.

## Authorization Workflows

The panel does not create verification tokens directly. It calls the launcher server-side using `launcher_internal_secret`.

Supported panel-to-launcher actions:

| Action | Purpose |
| --- | --- |
| `panel_invite` | Send parent/student invitation emails. |
| `panel_print_link` | Create a short-lived link to a read-only printable form. |

When the document icon is clicked in `Autoritzacions`, the full panel is disabled and the centered loading indicator is shown while the print/review link is created.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |
| `launcher_internal_secret` | Shared secret for trusted calls to `form_launcher_example`. |

## File Map

| File | Responsibility |
| --- | --- |
| `Code.js` | Client-callable Apps Script entry points. |
| `WebAppService.js` | Web app rendering and initial data orchestration. |
| `TutorGroupService.js` | Teacher-to-group resolution. |
| `TeacherService.js` | Teacher and substitution lookup. |
| `CacheService.js` | Cache rebuild and cache read helpers. |
| `ContactService.js` | Contact loading and updates. |
| `AuthorizationService.js` | Authorization read model and invalidation. |
| `AuthorizationInvitationService.js` | Trusted calls to the launcher. |
| `DinantiaService.js` | Dinantia API helpers. |
| `DatabaseService.js` | Registry/table/sheet helpers. |
| `Client.html` | Browser-side UI behavior. |
| `Index.html` | Main HTML shell. |
| `Styles.html` | UI styles. |

## Development Checks

Run from this folder:

```bash
node --check Code.js
node --check WebAppService.js
node --check CacheService.js
node --check ContactService.js
node --check DinantiaService.js
```

Client script parse check:

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('Client.html','utf8'); const script=html.replace(/^\\s*<script>\\s*/,'').replace(/\\s*<\\/script>\\s*$/,''); new Function(script); console.log('client script ok');"
```

## Documentation

| Path | Purpose |
| --- | --- |
| `docs/PROJECT.md` | Architecture and documentation conventions. |
| `docs/DB_STRUCTURE.md` | Shared database model. |
| `docs/features/TUTOR_GROUP_ENDPOINT.md` | Tutor endpoint specs. |
| `docs/features/AUTHORIZATIONS_PANEL.md` | Authorization panel specs. |
| `docs/DINANTIA_API_NOTES.md` | Local Dinantia API summary. |
| `docs/Dinantia-API-Documentation/` | Dinantia API reference snapshot. |

## Security

- Do not commit `.clasp.json`.
- Do not put credentials or script property values in source.
- Never expose raw tokens, token hashes, API secrets, or the launcher shared secret to the browser.
- Treat student, family, teacher, health, and authorization data as sensitive school data.
