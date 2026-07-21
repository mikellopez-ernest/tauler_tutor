# Form GAS Endpoint Specification

This document specifies the current Google Apps Script web endpoint for `auth_form`.

This is a documentation/specification file. Do not deploy or sync from this document without an explicit later instruction.

## Purpose

The endpoint serves a multilingual authorization form for students and families.

The form lets the user:

- Select the applicable authorization model from basic student context.
- Complete an initial respondent-identification page.
- Fill authorization, declaration, communication, health, and app-controlled signature-status fields.
- Change the visible language without reloading the page.
- Save and restore a local browser draft.
- Receive prefill data from a POST request.
- Submit the completed response to the school authorization database.
- Update the verified Dinantia contact name/phone when the respondent-identification values change.
- See a friendly confirmation page after a successful submission.
- Download the filled data as JSON.
- Print or save the rendered form as PDF through the browser.

The endpoint must persist submitted responses to the registry-backed `Autoritzacions` database. A first submission creates one parent response row and zero or more authorized-person rows. A verified owner edit updates the existing response row and replaces the authorized-person rows for the same `resposta_id`.

After a successful submission, the endpoint must refresh `Dinantia` -> `authorizations_cache` so the tutor panel can show the new authorization without waiting for the nightly cache rebuild.

After the cache refresh succeeds and the client receives the success response, the form must hide the editable form and show a confirmation page instead of a browser alert. The confirmation page must use this Catalan copy:

- Title: `Resposta enregistrada`
- Body: `La teva resposta ha estat correctament enregistrada.`

The confirmation page may show the generated `resposta_id` as a secondary reference code and may provide a button back to the school website, but it must not expose raw server payloads or technical details.

When the form is opened from a verified parent/contact token, the first respondent-identification step must be prefilled with the verified Dinantia contact data. On submit, contact edits must be written back to Dinantia and to `Dinantia` -> `contacts_cache` after validation.

## Deployment And Access

The Apps Script project is configured as a web app.

Required manifest settings:

| Setting | Required value |
| --- | --- |
| Runtime | V8 |
| Timezone | `Europe/Madrid` |
| Execute as | Deploying user |
| Access | Anyone, including anonymous users |


Current deployed endpoint URL:

`https://script.google.com/macros/s/AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg/exec`

Current deployment ID:

`AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg`

The form URL is not intended to be shared directly. During the current flow, families access it through `form_launcher_example`, which submits a POST request with the required prefill data. The endpoint must still be accessible to anonymous users because the launcher deployment is public and family contacts may not have school-domain Google accounts.

The endpoint entry points are:

```javascript
function doGet()
function doPost(e)
```

`doGet()` must render `Index.html` as a template using only configured default values.

`doPost(e)` must accept request-provided prefill data, merge it with configured default values, and render the same `Index.html` template.

Both entry points must set:

- Page title: `Autoritzacions, declaracions i comunicacions`
- Viewport meta tag for responsive layout.
- `XFrameOptionsMode.ALLOWALL`, matching the current project behavior.

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `Code.gs` | Server entry points, POST prefill parsing, HTML partial include helper, and client-callable submit endpoint. |
| `Index.html` | Main HTML structure and form markup. |
| `Styles.html` | CSS styles for screen and print. |
| `App.html` | Client-side step navigation, respondent-identification validation, form behavior, model selection, validation, signature-status handling, local save/restore, and JSON export. |
| `I18n.html` | Native translation engine. |
| `Translations_ca.html` | Canonical Catalan catalogue. |
| `Translations_TEMPLATE.html` | Template for future language catalogues. |
| `Translations_*.html` | Additional language catalogues. |

## Included Languages

The current endpoint includes:

| Code | Language |
| --- | --- |
| `ca` | Catalan |
| `es` | Spanish |
| `en` | English |
| `ru` | Russian |
| `uk` | Ukrainian |
| `ar` | Arabic, right-to-left |

Catalan is the canonical source language.

Translation keys are the normalized Catalan text strings, not CSS selectors or element positions.

## Internationalization Rules

The i18n engine must:

- Register every language catalogue before initialization.
- Use Catalan as the default language.
- Store the selected language in `localStorage`.
- Change language without reloading the page.
- Preserve form fields when the language changes.
- Translate dynamically added content through a `MutationObserver`.
- Set `document.documentElement.lang` and `dir`.
- Validate catalogues at startup and warn in the browser console when a language misses keys.
- Fall back to Catalan text when a translation is missing.

## Authorization Models

The client must select one model from the initial setup questions:

| Model | Meaning |
| --- | --- |
| `eso_menor14` | ESO student younger than 14. |
| `eso_14_17` | ESO student from 14 to 17. |
| `batx_menor18` | Underage Batxillerat student. |
| `post_menor18` | Underage vocational/post-compulsory student. |
| `major18` | Adult student. |

Each model controls:

- Document reference code.
- Subtitle.
- Whether responsible adult fields are required.
- Whether student signature status is required.
- Whether ESO exit authorization is shown.
- Whether recess exit authorization is shown.
- Whether academic communication authorization is shown.
- Whether municipal trips authorization is shown.
- Whether health communication consent is shown.
- Whether paracetamol authorization is shown.
- Whether TIS is included in the student document label.



## Form Step Flow

The form must be split into two client-side steps.

| Step | Page | Purpose |
| --- | --- | --- |
| 1 | Respondent identification | Collect the full name and phone number of the person answering the form. |
| 2 | Authorization form | Show the existing authorization, declaration, communication, health, and signature-status form. |

Step 1 must be shown first when the endpoint loads through either `doGet()` or `doPost(e)` in normal editable-new-submission mode.

The existing authorization form must remain hidden until the user completes Step 1 and clicks `Següent`.

Mode-specific exceptions:

| Mode | Step 1 behavior |
| --- | --- |
| `edit_owner` | Skip Step 1 and render the existing form filled and editable. |
| `readonly` | Skip Step 1 and render the existing form filled and disabled. |
| `readonly_print` | Skip Step 1 and render the existing form filled, disabled, expanded, and printable. |
| `student_confirm` | Skip Step 1 and render the existing form filled and disabled with only the student confirmation action. |

### Step 1: Respondent Identification

Step 1 must contain only two mandatory user fields:

| Visible label | Field name | Required | Meaning |
| --- | --- | --- | --- |
| `Nom sencer` | `responent_nom_sencer` | Yes | Full name of the person answering/submitting the form. |
| `Telèfon` | `responent_telefon` | Yes | Phone number of the person answering/submitting the form. |

Step 1 controls:

| Control | Behavior |
| --- | --- |
| `Següent` | Validates Step 1 and reveals Step 2 when both fields are valid. |

Prefill rules:

- Parent/contact flows should prefill `responent_nom_sencer` from the verified Dinantia contact name.
- Parent/contact flows should prefill `responent_telefon` from the verified Dinantia contact phone.
- Step 2 `responsable_nom` should be prefilled from the same verified contact full name when the form model requires responsible-person data.

Validation rules:

- `responent_nom_sencer` must be non-blank after trimming.
- `responent_telefon` must be non-blank after trimming.
- `responent_telefon` should be validated client-side before allowing the user to continue.
- Phone validation should accept common Spanish local phone numbers and international phone values.
- If validation fails, keep the user on Step 1 and show a clear Catalan validation message.

### Step 2: Existing Authorization Form

After Step 1 is valid and the user clicks `Següent`, the existing authorization form appears.

Rules:

- Step 2 must preserve all current form behavior: model selection, translated labels, local draft support, JSON export, print behavior, and submit behavior.
- Values entered in Step 1 must remain part of the same form state.
- The user should not lose Step 1 values when changing language.
- The app may allow returning to Step 1 later, but this is optional in the first implementation.

### Translation Requirements

Step 1 must use the same translation system as the rest of the form.

Rules:

- `Nom sencer`, `Telèfon`, `Següent`, and Step 1 validation messages must be present in the Catalan canonical catalogue.
- All included language catalogues must be updated with the same keys.
- Language changes must not clear Step 1 inputs.
- RTL behavior must apply to Step 1 when Arabic is selected.

### Step 1 Persistence

The respondent-identification fields must be persisted in the parent authorization row:

| Form field | Target table | Target column |
| --- | --- | --- |
| `responent_nom_sencer` | `Autoritzacions` -> `autoritzacions` | `responent_nom_sencer` |
| `responent_telefon` | `Autoritzacions` -> `autoritzacions` | `responent_telefon` |

These fields are not stored in `persones_autoritzades`. They identify who answered the form, not who is authorized to pick up the student.


## Prefill Model

The form must support two categories of prefilled data:

1. School/course defaults stored in source code constants.
2. Student-context data received through a POST request from another school system or internal database workflow.

Prefilled values should be applied when the form is rendered, before the family starts editing.

The user may edit prefilled values unless a later UX spec marks a specific field as read-only.

### Constant Defaults

The following fields must always have default values stored in a centralized constant in the form code:

| Visible label | Form field | Source |
| --- | --- | --- |
| `Curs inicial` | `curs_inici` | Code constant. |
| `Curs final` | `curs_fi` | Code constant. |
| `Nom del centre` | `centre_nom` | Code constant. |
| `Codi del centre` | `centre_codi` | Code constant. |
| `Municipi` | `municipi` | Code constant. |
| `Adreça electrònica` | `centre_email` | Code constant. |
| `Lloc` | `lloc` | Code constant. |

The constant should live in one clear configuration block so these values can be changed each academic year without touching form logic.

Current required value: `centre_codi` default value must be `43009850`.

Suggested constant shape:

```javascript
const FORM_DEFAULTS = {
  curs_inici: '',
  curs_fi: '',
  centre_nom: '',
  centre_codi: '43009850',
  municipi: '',
  centre_email: '',
  lloc: ''
};
```

Implementation may choose the exact file name, but the constant must not be duplicated across client and server logic. The server should inject the resolved initial form data into the HTML template.

### POST Prefill Data

The form must support opening through a POST request containing student-context values.

These values are not constants. They are expected to come from the school database or calling workflow.

| Visible label | Form field | Source |
| --- | --- | --- |
| `Quins estudis cursarà l'alumne/a?` | `studyType` | POST request. |
| `L'alumne/a és major d'edat?` | `isAdult` | POST request. |
| `Nom i cognoms de l'alumne/a` | `alumne_nom` | POST request. |
| `DNI/NIE/Passaport` | `alumne_document` | POST request. |
| Internal student ID | `id_student` | POST request. |

Optional POST support for ESO age:

| Visible label | Form field | Source |
| --- | --- | --- |
| `Té 14 anys o més?` | `is14Plus` | POST request, when available. |

`is14Plus` is not part of the initial required POST contract, but the model-selection logic still needs it when `studyType` is ESO and `isAdult` is `no`. If it is missing, the form must leave the question visible for the user to complete.

### POST Accepted Field Names

The endpoint should accept canonical form field names in POST data:

| POST field | Target |
| --- | --- |
| `studyType` | Initial setup study type. |
| `isAdult` | Initial setup adult status. |
| `is14Plus` | Initial setup 14-plus status, optional. |
| `alumne_nom` | Student full name. |
| `alumne_document` | Student identity document. |
| `id_student` | Internal student identifier from the school database. |
| `responent_nom_sencer` | Verified respondent full name when provided by the launcher. |
| `responent_telefon` | Verified respondent phone when provided by the launcher. |
| `responsable_nom` | Legal responsible/contact full name when provided by the launcher. |

For compatibility with database-oriented callers, the endpoint may also accept these aliases:

| POST alias | Canonical field |
| --- | --- |
| `estudis` | `studyType` |
| `major_edat` | `isAdult` |
| `major_14` | `is14Plus` |
| `nom_alumne` | `alumne_nom` |
| `document_alumne` | `alumne_document` |
| `student_id` | `id_student` |
| `id_alumne` | `id_student` |

### POST Format

The endpoint must be prepared to read POST data from Apps Script's event object.

Supported request formats:

| Format | Apps Script source |
| --- | --- |
| HTML form encoded fields | `e.parameter` / `e.parameters` |
| JSON body | `e.postData.contents` when `postData.type` is JSON-compatible. |

If both are present, JSON body values should take precedence over `e.parameter` values.

Unknown POST fields should be ignored by the prefill layer unless later specs define them.

### POST Flow Mode Fields

The launcher may send operational mode/context fields to control how the form renders and saves.

| POST field | Meaning |
| --- | --- |
| `form_mode` / `mode` | Rendering/save mode: `new_parent`, `new_student_adult`, `edit_owner`, `readonly`, `readonly_print`, or `student_confirm`. |
| `resposta_id` | Existing response ID to load for edit, read-only, print, or student confirmation. |
| `verified_actor_type` | Verified actor type, usually `parent` or `student`. |
| `verified_dinantia_account_id` | Dinantia account ID verified by the launcher. |
| `verified_email` | Normalized verified email from the launcher token. |
| `launcher_token` | Raw launcher token only when the form must POST a student confirmation back to the launcher. It must never be persisted in `autoritzacions`. |

Rules:

- `readonly`, `readonly_print`, and `student_confirm` must reuse the exact `auth_form` UI with controls disabled, not a separate simplified table.
- Protected modes must require a valid short-lived launcher token before loading an existing response or accepting an editable save. The public form endpoint must not trust a naked `resposta_id`.
- All persisted saves must require a verified launcher mode/token. A direct public `doGet()` page may render for compatibility or smoke testing, but it must not be able to write data to the database.
- Read-only modes must translate stored sheet booleans into the form control values before filling the UI. Real boolean `TRUE` / string `TRUE` / `si` select the affirmative radio or checkbox state; real boolean `FALSE` / string `FALSE` / `no` select the negative radio state.
- Existing `data_signatura` must be preserved when rendering a submitted response. The form may default to today's date only for a new response that does not already have `data_signatura`.
- Date inputs must receive normalized `yyyy-mm-dd` values. When a stored sheet date arrives as an Apps Script date, ISO datetime, or local `dd/mm/yyyy` string, the renderer must convert it before assigning it to the `<input type="date">`.
- The raw launcher token may exist only as a transient POST/hidden-field value. It must not be stored in `autoritzacions`, logged, or shown in UI.
- `readonly_print` must expand the form and offer browser printing.
- `edit_owner` must load the existing row by `resposta_id` and save changes back to that same row.
- New parent submissions write `submitted_by_dinantia_account_id` and `submitted_by_email`.
- Owner edits preserve original submission ownership and update `updated_at` / `updated_by_email`.
- Parent/contact submissions use `verified_dinantia_account_id` to identify the Dinantia contact that may be updated from Step 1 values.
- Parent/legal-guardian modes must not set `signatura_alumne` to true.
- Adult-student editable mode may set `signatura_alumne` to true because the adult student is the respondent.
- Student-confirm mode must not save the whole form. It only submits confirmation back to the launcher so the launcher can set `signatura_alumne`.

### Prefill Merge Order

Initial form data must be resolved in this order:

1. Start with `FORM_DEFAULTS`.
2. Merge accepted POST prefill fields when `doPost(e)` is used.
3. Render the form with the merged data.
4. Run client-side model selection logic from the prefilled setup values.

POST fields must override constants only for fields explicitly accepted by the POST contract. Student-specific POST values must never mutate the code constants.

### Prefill Validation

The server should normalize obvious values before injecting them into the template.

Rules:

- Trim string values.
- Accept `studyType` values supported by the current form: `eso`, `batx`, `fp`.
- Accept `isAdult` and `is14Plus` values in the form's expected Catalan values: `si` and `no`.
- Optionally normalize common boolean-like values such as `true`, `false`, `1`, and `0` into `si` or `no`.
- Invalid or unsupported POST values should be ignored or left blank, not written into hidden state.

The client must still validate the completed form before allowing submission.

### Prefill Persistence

Prefilled values are part of the final submitted form data.

When the user submits the form, the persisted `autoritzacions` row must include the final field values visible in the form, including:

- Step 1 respondent-identification fields.
- Constant defaults that remained unchanged.
- POST-provided student context that remained unchanged.
- `id_student`, which identifies the student in the school database and must be persisted even if it is not visible/editable in the form.
- Any user edits made after prefill.

### Respondent Contact Write-Through

For verified parent/contact flows, Step 1 respondent values are also a controlled contact update.

Rules:

- If `verified_dinantia_account_id` is present and the actor type is `parent`, compare submitted `responent_nom_sencer` and `responent_telefon` with the verified contact data.
- Send changed contact values to Dinantia through the account update API.
- Dinantia `phone` values must be sent in E.164 format. Spanish 9-digit values such as `686503045` must be sent to Dinantia as `+34686503045`.
- Blank phone values are valid and must be sent to Dinantia as `null`, meaning the contact phone should be removed.
- Validate phone format client-side before submit so obviously invalid values are not sent to Dinantia.
- If the Dinantia update succeeds, update matching rows in `Dinantia` -> `contacts_cache`.
- The canonical authorization row still stores the submitted respondent values as entered/displayed in the form.
- Do not update Dinantia for student confirmation, tutor print, or read-only modes.
- Do not expose Dinantia API errors directly to families; show a clear form-save error with safe detail.


## Required Script Properties

The Apps Script project must define these script properties.

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

The endpoint must read `db` with Apps Script script properties and open the registry-backed database structure documented in `tauler_tutor/docs/DB_STRUCTURE.md`.

If `db` is missing, blank, or only whitespace, submission must fail with a clear configuration error.

## Registered Database Tables

The form endpoint uses the logical table `Autoritzacions`.

The registry spreadsheet must map `Autoritzacions` to the spreadsheet that contains these sheets:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Autoritzacions` | `autoritzacions` | One row per submitted form response. |
| `Autoritzacions` | `persones_autoritzades` | Zero-to-many authorized pickup people for each response. |
| `Autoritzacions` | `verification_tokens` | Invitation/token history used to include latest invitation metadata in the cache. |
| `Dinantia` | `authorizations_cache` | Fast authorization read model used by `tauler_tutor`. |

Relationship:

| From | To | Rule |
| --- | --- | --- |
| `persones_autoritzades.resposta_id` | `autoritzacions.resposta_id` | Every authorized-person row belongs to one form response. |

## Client-Side Data Handling

The endpoint stores drafts locally in the user's browser, and stores submitted responses in the `Autoritzacions` spreadsheet.

Supported browser actions:

| Action | Behavior |
| --- | --- |
| Save local draft | Serializes the form to `localStorage`. |
| Restore local draft | Reads the saved object from `localStorage` and fills the form. |
| Download JSON | Downloads the serialized form object as a `.json` file. |
| Print / Save PDF | Uses the browser print flow. |
| Validate form | Runs HTML form validation and focuses the first invalid field when possible. |
| Submit form | Sends the serialized response to Apps Script and persists it in the two authorization sheets. |

The local draft key is currently:

```text
autoritzacionsForm5Models
```

The selected language key is currently:

```text
autoritzacionsIdioma
```


## Submission Persistence

When the user submits the form, the client must send the complete serialized form object to a server-side Apps Script function.

The server-side function must:

1. Validate the required database configuration.
2. Open the `Autoritzacions` spreadsheet through the registry.
3. Open and validate the `autoritzacions` sheet.
4. Open and validate the `persones_autoritzades` sheet.
5. Generate one new `resposta_id` for the response.
6. Generate `data_hora_enviament` at submission time in ISO8601 format.
7. Append exactly one row to `Autoritzacions` -> `autoritzacions`.
8. Extract all authorized pickup people from the submitted form data.
9. For each non-empty authorized person, generate a new `id` and append one row to `Autoritzacions` -> `persones_autoritzades` using the same `resposta_id`.
10. Refresh `Dinantia` -> `authorizations_cache` from `Autoritzacions` -> `autoritzacions` and `Autoritzacions` -> `verification_tokens`.
11. Return a success response containing at least the generated `resposta_id`.

A submitted response can have zero authorized pickup people. In that case, the app must still create the parent `autoritzacions` row and create no rows in `persones_autoritzades`.

### Parent Table: `Autoritzacions` -> `autoritzacions`

The parent sheet stores one row per submitted response.

Required headers are documented in `tauler_tutor/docs/DB_STRUCTURE.md` under `Shared Table: Autoritzacions -> autoritzacions`.

Important persistence rules:

- `resposta_id` is the primary key for the submitted response.
- `resposta_id` must be unique.
- `data_hora_enviament` is generated by the server, not trusted from the client.
- `idioma_formulari` must store the active UI language at submission time.
- `responent_nom_sencer` and `responent_telefon` must be persisted from Step 1.
- `id_student` must be persisted from POST-provided context when available.
- `data_signatura` must be generated automatically from today's date in `Europe/Madrid`, not manually entered by the user.
- The student full name must appear near the top of every rendered form page/step when `alumne_nom` is known.
- Existing saved responses must preserve and render their stored `data_signatura`; only new responses default it to today.
- `lloc` must come from `FORM_DEFAULTS`, unless the user edits it before submission.
- Boolean authorization and signature-status fields must be normalized before writing.
- Internal fields `estat_validacio` and `observacions_internes` are reserved for school use and must not be taken from family input unless explicitly specified later.

### Child Table: `Autoritzacions` -> `persones_autoritzades`

The child sheet stores authorized pickup people.

Required headers:

| Header | Meaning |
| --- | --- |
| `id` | Unique row identifier for the authorized-person record. |
| `resposta_id` | Parent response ID. |
| `nom_sencer` | Authorized person's full name. |
| `qualitat_de` | Relationship or role with respect to the student/family. |

The current form fields for authorized pickup people are dynamic and named with numeric suffixes:

| Form field pattern | Target column |
| --- | --- |
| `persona_autoritzada_nom_{n}` | `nom_sencer` |
| `persona_autoritzada_qualitat_{n}` | `qualitat_de` |

Extraction rules:

- Iterate over all numeric `{n}` suffixes present in the submitted data.
- Trim both name and relationship values.
- Create a child row only when at least one of `nom_sencer` or `qualitat_de` is non-blank.
- Use the same generated `resposta_id` as the parent row.
- Generate a unique `id` for each child row.

### Boolean Normalization

The form contains radio buttons, checkboxes, and optional blocks. The persistence layer must convert authorization/declaration answers to stable boolean values before writing to Sheets.

Rules:

- Values equivalent to affirmative consent, such as `si`, `sí`, `true`, `TRUE`, or real boolean `true`, must be written as `TRUE`.
- Values equivalent to negative consent, such as `no`, `false`, `FALSE`, or real boolean `false`, must be written as `FALSE`.
- Missing values for fields that were hidden or not applicable should be written blank unless a later field-specific spec requires `FALSE`.
- Checkbox declarations are `TRUE` only when checked/accepted.

### Signature Status Persistence

The form must not capture handwritten canvas signatures in this version.

Signature fields are hidden boolean fields controlled by app logic:

| Field | Meaning |
| --- | --- |
| `signatura_responsable` | Whether the responsible person is considered to have signed/accepted the response. |
| `signatura_alumne` | Whether the student is considered to have signed/accepted the response. |

Rules:

- Both fields must be hidden from the user interface.
- Both fields must be written as real booleans.
- The app decides which field or fields are true depending on who answers the form and the selected authorization model.
- For `form_mode = new_student_adult`, the app must write `signatura_alumne = TRUE`, `student_confirmed_at = submission timestamp`, and `student_confirmed_email = verified student email`.
- If the selected model does not require a responsible person signature, `signatura_responsable` should be `FALSE` or blank according to the final implementation decision.
- If the selected model does not require a student signature, `signatura_alumne` should be `FALSE` or blank according to the final implementation decision.
- The app must ask before implementing the exact rule that determines who answered the form if that context is not yet available.

### Integrity And Failure Handling

The parent and child rows are one logical submission.

Required behavior:

- Do not create child `persones_autoritzades` rows without a parent `autoritzacions` row.
- If the parent row cannot be created, no child rows may be created.
- If child row creation fails after parent creation, the app must return a clear error and preserve enough diagnostic context for manual repair.
- The server response must not expose credentials or sensitive implementation details.
- The client must show a clear user-facing success or failure message.
- After the user accepts the success dialog, the page must redirect automatically to `https://agora.xtec.cat/sesernestlluch-cunit/`.

Google Sheets does not provide full database transactions, so implementation must be careful with write order, error reporting, and idempotency.

### Authorization Cache Write-Through

The canonical write remains `Autoritzacions` -> `autoritzacions`.

After the canonical row is appended, the form endpoint must rebuild `Dinantia` -> `authorizations_cache`.

Rules:

- Preserve row 1 headers in `authorizations_cache`.
- Overwrite data rows in `authorizations_cache`.
- Keep the latest authorization row per `id_student`.
- Include latest invitation metadata from `Autoritzacions` -> `verification_tokens`.

### Idempotency

Repeated clicks or retries must not accidentally create duplicate submissions.

The client must disable the submit button while submission is in progress.

A future implementation may add a client-generated submission token. Until that is specified, the server-generated `resposta_id` is the authoritative identifier of a completed submission.

## Current Form UI Revision

These requirements refine the existing form behavior and must be implemented without changing the first respondent-identification step. The first part where the user enters their own information is accepted as-is and must not be redesigned in this revision.

### Section 2: Estada, Sortides I Comunicacions

The first question in this section controls whether the authorized-pickup people subsection is needed.

Rules:

- If the first question is answered `yes`, hide the authorized-pickup people subsection entirely.
- If the first question is answered `no`, show the authorized-pickup people subsection.
- When the subsection is shown, it must initially display exactly one authorized-person row.
- The subsection must include an `Afegir persona` button so the user can add as many authorized-person rows as needed.
- Hidden authorized-person fields must not block validation and must not be submitted as meaningful rows.

The academic-communication question controls whether the academic-contact subsection is needed:

Question:

`Autoritzo el centre educatiu a comunicar dades acadèmiques rellevants i relatives a l'assistència a una tercera persona.`

Rules:

- If the answer is `yes`, show the dependent academic-contact fields:
  - `Nom i cognoms de la persona de contacte`
  - `Adreça electrònica`
  - `Relació amb l'alumne/a`
  - `Pare`
  - `Mare`
  - `Tutor/a legal`
  - `Altres`
- If the answer is `no`, hide the dependent academic-contact fields.
- Hidden academic-contact fields must be disabled and cleared so old hidden data is not accidentally submitted.
- Hidden academic-contact fields must not block validation.

### Section 3: Imatges, Veu, Dades I Obres

`Plataformes no administrades pel centre` and `Plataformes o accés` are dependent fields.

Rules:

- `Plataformes o accés` is enabled only when `Plataformes no administrades pel centre` is answered/checked as `yes`.
- When the parent answer is not `yes`, the dependent field must be disabled and cleared or ignored on submit.
- The dependent field must be visually indented to the right to show that it depends on the previous question.
- The field `Publicació de les inicials de l'alumne/a i del centre` must be removed from the current form UI.
- Removed `publicacio_inicials` data must not be shown in the tutor authorization matrix.

### Section 6: Carta De Compromís Educatiu

The form must add a section titled `6. Carta de compromís educatiu`.

Rules:

- Show the educational commitment letter as a readable document block.
- Store the mandatory acknowledgement in `carta_compromis_acceptada`.
- The field is a required boolean acknowledgement.
- The only valid submitted value is `TRUE`.
- The visible acceptance text is `He llegit i accepto la Carta de compromís educatiu.`
- The field must be included in editable, read-only, and print renderings.
- The field must be present in every translation catalogue.

### Section 7: Normativa D'ús De Telèfons Mòbils

The form must add a section titled `7. Normativa d'ús de telèfons mòbils`.

Rules:

- Show the mobile phone policy as a readable document block.
- Store the respondent choice in `consentiment_mobil`.
- The field is required.
- `TRUE` means consent is given for the student to bring a mobile phone to school under the described rules.
- `FALSE` means consent is refused.
- The two visible radio labels are:
  - `NO DONO EL MEU CONSENTIMENT a què el meu fill/a porti telèfon mòbil, atenent-me a la normativa aquí descrita.`
  - `DONO EL MEU CONSENTIMENT PARTICULAR a què el meu fill/a porti telèfon mòbil al centre, atenent-me a la normativa aquí descrita.`
- The field must be included in editable, read-only, and print renderings.
- The field must be present in every translation catalogue.

### Section 8: Lloc, Data I Signatures

During the current testing phase, only the responsible person's signature status is being tested.

Rules:

- Keep `lloc` prefilled from constants.
- Keep `data_signatura` automatically filled with today's date.
- `signatura_responsable` may be set by the app according to the current responsible-person submission flow.
- Do not automatically set `signatura_alumne` to `TRUE` in this testing phase.
- Student signature behavior will be specified later.

### Form Buttons

The visible button set must be simplified.

Rules:

- Delete or hide all visible action buttons except `Envia el formulari`.
- Draft, restore, download JSON, print, debug, or auxiliary buttons must not be visible in the current user-facing form.
- The submit button must still be disabled while submission is in progress to prevent duplicate submissions.

## Signature Fields

The form uses hidden boolean signature-status fields instead of visible canvas signature pads.

Rules:

- `lloc` is a normal form field prefilled from `FORM_DEFAULTS`.
- `data_signatura` is automatically filled with today's date in `Europe/Madrid`.
- `signatura_responsable` is hidden and controlled by app logic.
- `signatura_alumne` is hidden and controlled by app logic, but must not be automatically set to `TRUE` during the current parent-signature-only testing phase.
- The two signature-status fields must be submitted and persisted as booleans.
- The user must not draw, upload, or manually edit a signature in this version.

## Validation

The endpoint currently relies on browser-side HTML validation and custom checks in `App.html`.

Validation rules:

- A model must be selected through the initial setup.
- Required visible fields must be completed.
- Hidden model-specific fields must be disabled so they do not block validation.
- On failed validation, focus the first invalid field when available.

## Print Behavior

The print layout must:

- Hide non-print controls.
- Expand all accordion sections.
- Remove decorative shadows.
- Avoid breaking important question blocks across pages when possible.

The endpoint does not generate PDF server-side in the current version.

## Out Of Scope For Current Version

The current form endpoint does not:

- Authenticate a specific student or tutor.
- Read teacher, tutor group, or student data from `tauler_tutor` feature tables.
- Save generated PDFs to Drive.
- Send emails.
- Call Dinantia except for the verified parent/contact name and phone write-through explicitly specified above.
- Register changelog entries in `Dinantia` -> `changelog`.

These behaviors may be specified later if the form becomes connected to the tutor dashboard or other school workflows.

## Authorization Requirement

The form project uses `SpreadsheetApp` and script properties to persist responses. After these scopes are introduced or changed, the deploying account must authorize the project before anonymous users can execute the web app successfully.

The project includes a helper function:

```javascript
authorizeServices()
```

Run this function once from the Apps Script editor as the deploying account (`Admin Domini`) and approve the requested permissions. After authorization, create or update the Web app deployment with:

| Setting | Required value |
| --- | --- |
| Execute as | Deploying user / Admin Domini |
| Access | Anyone, including anonymous users |

If the endpoint still shows a Google Drive "Need access" page with `macros/edit?lib=...`, Google is blocking execution before `doGet`/`doPost`; re-check the deployment access and the deploying account authorization.
