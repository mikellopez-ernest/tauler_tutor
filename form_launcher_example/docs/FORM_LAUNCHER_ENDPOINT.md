# Form Launcher Example Endpoint

This document specifies the temporary `form_launcher_example` GAS endpoint used while developing and testing the authorization-form launch flow.

This is a specification only. Do not implement, deploy, or sync from this document without an explicit later instruction.


## Current Testing Deployment

Current deployed endpoint URL:

`https://script.google.com/macros/s/AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg/exec`

Current deployment ID:

`AKfycbwOgYsVCf-MdEEbpGFFmWyjMB__MrgDowQuo7W6Ky8ymZwkY_-c7gUPm9QGTGUxiYGrYg`

For the current development/testing phase, this deployment is intentionally accessible to anyone, including users without a signed-in email. This is acceptable only because direct public access never exposes student/form data before email-token verification.


Current downstream `auth_form` endpoint URL:

`https://script.google.com/macros/s/AKfycbyZpqmW-iGRN6xr_GdpCpeQxstvcYjZTM8CcqI657YFPfuTCU7Il3Zp2gJRkBykbHjjzg/exec`

The launcher must use the public `/macros/s/.../exec` URL, not a domain-scoped `/a/macros/...` URL and not a library/edit URL.

## Sender-Specific Launcher Paths

The production launcher must support two explicit GET entry paths:

| Query string | User path |
| --- | --- |
| `?sender=parent` | Family/legal guardian verification flow. |
| `?sender=student` | Student verification flow. |

If `sender` is missing or invalid, the launcher should render a simple choice page or default to the parent flow according to the final implementation decision. The safer UX is a choice page with two options: `Família` and `Alumne/a`.

Both sender paths must use secure email-token verification. The launcher must not reveal form/student data immediately after a user types an email address.

All emails sent by this launcher must use `Institut Ernest Lluch i Martín` as the sender display name.

## Parent Flow

### Parent Entry Page

`GET ?sender=parent` renders the parent identity-verification page already specified in `Identity-Verification Page Text`.

The parent submits their email address through the `Continuar` button.

### Parent Email Lookup

The submitted email is searched in Dinantia using the Dinantia API.

If the email is not found, show the not-registered error page already specified for parent users.

If the email is found, the launcher must identify the students/children associated with that parent/contact account. Parent-child associations from Dinantia are considered reliable and do not need to be cross-checked with `Dades alumnes` unless a lookup fails.

### Parent With Multiple Children

If the parent has more than one associated son/daughter under 18, the first authenticated step must let them choose which student they want to access the form for.

Rules:

- The parent must not be asked to type the student name manually if the system already knows the associated students.
- Show only students associated with the verified parent/contact account and younger than 18.
- After selection, continue using the selected student context.
- The secure token must be tied to both the verified parent/contact and the selected student.

If the parent has exactly one associated under-18 student, the selection step may be skipped.

If every associated student is 18 or older, show a safe message explaining that there is no under-18 student available for family submission and that adult students must complete the form themselves.

### Parent Access When Student Is Adult

If the selected student is 18 or older, the parent must not access or complete the form.

Render a Catalan information page explaining that students aged 18 or older must complete the authorization form themselves.

Required meaning:

```text
Aquest formulari ha de ser emplenat pel mateix alumne/a perquè és major d'edat.

Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.
```

The page must not render the form-forwarding button.

### Parent Access When Form Already Exists

If the selected student already has a row in `Autoritzacions` -> `autoritzacions`, the launcher must check response ownership.

Ownership is determined by comparing the verified Dinantia parent/contact account ID with `autoritzacions.submitted_by_dinantia_account_id`.

If the verified parent/contact is the original submitter:

- Open the exact `auth_form` UI filled with the existing response.
- Use `form_mode = edit_owner`.
- Allow editing.
- Save changes to the same `resposta_id` row.
- Do not create a new authorization row.

If the verified parent/contact is not the original submitter:

- Open the exact `auth_form` UI filled with the existing response.
- Use `form_mode = readonly`.
- Disable all form fields and normal submit actions.
- Show only read/print behavior.

The page must include a Catalan message explaining:

- The authorization form for this student has already been submitted.
- Whether the current verified contact can edit it or only read it.
- If they have questions, corrections, or complaints, they must contact the school.

Required meaning:

```text
Aquest formulari ja consta com a emplenat.

Podeu consultar-ne la informació en mode només lectura. Si detecteu alguna errada o voleu fer qualsevol consulta o reclamació, poseu-vos en contacte amb el centre.
```

No submit/edit button may be shown in parent read-only mode.

### Parent Access When Student Is Under 18 And Form Missing

If the selected student is under 18 and there is no existing row in `Autoritzacions` -> `autoritzacions`, the verified parent flow may continue to the editable authorization form.

The final verified launcher page renders the family message and the `EMPLENAR EL FORMULARI` POST button to `auth_form` using server-generated hidden fields from verified metadata.

## Student Flow

### Student Entry Page

`GET ?sender=student` renders a student identity-verification page.

The page must ask for:

| Field | Requirement |
| --- | --- |
| Student email | Required email textbox. Must be an `@iernestlluch.cat` email address unless later specs allow exceptions. |
| Course/group | Required select populated dynamically from `Dinantia` -> `dinantia_2_dades_alumnes`. |

The group list must be generated on the fly from the registry-backed `Dinantia` -> `dinantia_2_dades_alumnes` table. Do not hardcode the list in code.

Display value: use the group name from `dinantia_2_dades_alumnes.dinantia_group_name` unless later specs define a different display field.

Resolution value: use `dinantia_2_dades_alumnes.dades_alumnes_sheet` to locate the corresponding sheet inside the `Dades alumnes` spreadsheet.

### Student Entry Page Text

The student page must show this Catalan text:

```text
Accés al formulari d'autoritzacions

Benvolgut/da,

Aquest accés està pensat per a l'alumnat del centre. Si ets major d'edat, podràs emplenar directament el formulari d'autoritzacions, declaracions i comunicacions. Si tens 14 anys o més i la teva família ja ha emplenat el formulari, podràs revisar-lo i confirmar la teva conformitat.

Per aquest motiu, abans d'accedir al formulari és necessari verificar la teva identitat.

Per començar, introdueix la teva adreça de correu electrònic i selecciona el curs o grup al qual pertanys aquest curs escolar. Amb aquesta informació podrem localitzar el teu expedient i obrir el procés que correspongui en el teu cas.

Si les dades són correctes, rebràs un correu electrònic amb un enllaç personal i segur que et permetrà continuar el procés.

Important: si no reps el correu electrònic al cap d'uns minuts, revisa també la carpeta de correu brossa o correu no desitjat. Si després de revisar-la continues sense haver-lo rebut, posa't en contacte amb el centre.

Correu electrònic

Introdueix l'adreça de correu electrònic que tens registrada al centre educatiu.

[ email textbox ]

Curs o grup

Selecciona el curs o grup al qual pertanys aquest curs escolar.

[ group select ]

[ Continuar ]

Protecció de dades

L'adreça de correu electrònic i el curs o grup facilitats s'utilitzaran exclusivament per verificar la teva identitat, localitzar el teu expedient acadèmic i gestionar el procés d'autoritzacions i declaracions del centre. Les dades seran tractades d'acord amb la normativa vigent en matèria de protecció de dades personals i únicament per a finalitats administratives i educatives relacionades amb aquest procediment.
```

### Student Group List

The student group dropdown must be populated from `Dinantia` -> `dinantia_2_dades_alumnes`, not from a hardcoded list.

Current expected group names are the same values currently registered in `Dinantia` -> `dinantia_2_dades_alumnes`, including ESO, Batxillerat, ACO, PFI, SMX, PCC, and AC groups. The implementation must tolerate group additions/removals by reading the table at runtime.

### Student Lookup Path

When the student submits email and group:

1. Normalize the email by trimming and lowercasing.
2. Validate that it is an `@iernestlluch.cat` email address.
3. Use the selected group to find the matching `Dinantia` -> `dinantia_2_dades_alumnes` row.
4. Read `dinantia_2_dades_alumnes.dades_alumnes_sheet`.
5. Open the `Dades alumnes` spreadsheet through the registry.
6. Open the sheet named by `dades_alumnes_sheet`.
7. Find the student by header `Correu alumne`.
8. Read the student ID from header `ID`.
9. Use that ID to match `Autoritzacions` -> `autoritzacions.id_student`.

Rules:

- Student matching must not be name-based.
- Compare emails case-insensitively after trimming.
- If the email is not found in the selected group sheet, show the same style of safe error as the parent flow: the user must use the registered email/group or contact the school.
- Do not reveal whether the email exists in another group.

### Student If Parent Form Missing

If the student is found but there is no row in `Autoritzacions` -> `autoritzacions` for that `id_student`, show an error page explaining that the family/legal guardian must submit the form first.

Required meaning:

```text
Encara no consta cap formulari d'autoritzacions emplenat per a aquest alumne/a.

Demana al teu pare, mare, tutor o tutora legal que empleni primer el formulari. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.
```

The student must not receive the read-only form or confirmation button until a parent/legal-guardian response exists, except for adult-student behavior described below.

### Student When Form Exists

If the student is found and an `Autoritzacions` -> `autoritzacions` row exists, the student receives the token verification email.

After token validation, the student must see the already submitted form in read-only mode and exactly one confirmation action.

Rules:

- The launcher must POST the student to `auth_form` with `form_mode = student_confirm`.
- `auth_form` must render the exact submitted form UI with all form fields disabled.
- The student must not edit parent/legal-guardian answers.
- Hide all normal form submit buttons.
- Show only one student confirmation button, for example `Confirmo`.
- When confirmed, update `Autoritzacions` -> `autoritzacions.signatura_alumne` to real boolean `TRUE` for that `id_student` / response row.
- If optional audit columns exist, write `student_confirmed_at` with the current timestamp and `student_confirmed_email` with the verified student email.
- Do not change `signatura_responsable`.
- Do not create a new authorization row.
- The audit columns are optional. The launcher must not fail if they do not exist.

## Adult Student Behavior

Students aged 18 or older complete the form themselves.

An adult student entering through `?sender=student` should receive the same functional treatment as a parent/legal guardian of a minor whose form is not yet submitted:

- They can authenticate through their student email and group.
- If no authorization row exists yet, they may continue to an editable form for themselves.
- The form prefill should identify the student and mark the flow as adult/student-driven according to the existing `auth_form` model rules.
- If a row already exists, show the read-only already-submitted behavior instead of creating a duplicate.
- Their verification email must not reuse the minor-student confirmation text. It must explain that, because the student is 18 or older, they must complete and sign the form themselves.
- Their launcher page after token validation must not use family/legal-guardian wording. It must address the student directly and use the same core message as the family flow, adapted to singular student wording.
- A successful adult-student submission is complete immediately. It must not require a second `student_confirm` flow.

Adult-student verification email copy:

```text
Benvolgut/da,

Per tal d iniciar correctament el curs escolar i mantenir actualitzada la teva informacio, et demanem que emplenis el teu formulari d autoritzacions, declaracions i comunicacions.

En aquest formulari podràs revisar les teves dades bàsiques, autoritzar les activitats i serveis del centre, facilitar la informació sanitària rellevant i signar electrònicament les autoritzacions necessàries per al curs escolar.

Per accedir-hi, fes clic al botó següent:

EMPLENAR EL FORMULARI

Aquest enllaç és personal i caduca en 24 hores.

Temps aproximat: 10 minuts.

Si tens qualsevol incidència tècnica o dubte sobre el formulari, pots contactar amb el centre a través del correu:

e3009850@xtec.cat

Cordialment,

Equip Directiu
Institut Ernest Lluch
Cunit
```

Use `Data Naixement` from `Dades alumnes` to calculate whether the student is 18 or older. This is the same header used by the tutor panel for birthdate/age calculations and is currently located in column AA.

A parent/legal guardian of an adult student must be blocked, as specified in `Parent Access When Student Is Adult`.

## Read-Only Form Mode

Both parent and student flows may need to render a submitted form in read-only mode.

Read-only mode requirements:

- Load the existing `Autoritzacions` -> `autoritzacions` row by `id_student` and selected/latest response row.
- Render the same `auth_form` layout used for editing.
- All fields must be read-only or disabled.
- Do not show editing controls.
- Do not show the normal `Envia el formulari` submit button.
- For parents, show only the informational message and no confirmation action.
- For students, show only the student confirmation action when `signatura_alumne` is still not true.
- If `signatura_alumne` is already true, show read-only mode with a message that the student confirmation has already been recorded.

## Tutor Print Link Flow

The launcher must also support a trusted server-to-server POST action from `tauler_tutor`:

```json
{
  "action": "panel_print_link",
  "secret": "script-property-value",
  "tutor_email": "teacher@iernestlluch.cat",
  "student": {
    "id": "DIN-A-000000",
    "name": "Student name"
  },
  "authorization": {
    "resposta_id": "RSP-..."
  }
}
```

Behavior:

- Validate `launcher_internal_secret`.
- Create a short-lived token in `Autoritzacions` -> `verification_tokens`.
- Store `sender = tutor_print`.
- Store `student_id` and `resposta_id`.
- Store metadata containing a form payload with `form_mode = readonly_print`.
- Return JSON with a launcher URL containing the raw token.
- Do not send an email for `panel_print_link`.
- The token must not expose `token_hash`, secret values, or full metadata to the browser.

When the tutor opens the returned launcher URL, the launcher validates the token and POST-forwards to `auth_form` with:

| Field | Value |
| --- | --- |
| `form_mode` | `readonly_print` |
| `resposta_id` | Response to render. |
| `id_student` | Student ID. |

## Tutor Panel Impact

The real parent/student flow can begin from the public launcher GET URL or from a panel-initiated invitation.

Updated tutor-panel behavior:

- Students missing an authorization row remain highlighted with a pale red background.
- `Estat` shows `Pendent` and an `Enviar a tutors` action.
- If `signatura_responsable` is true but `signatura_alumne` is not true, `Estat` shows `Pendent alumne` and an `Enviar a alumne` action.
- The tutor panel must not create verification tokens directly.
- The tutor panel calls the launcher server-side. The launcher remains responsible for token generation, token storage, and email delivery.

## Panel-Initiated Invitation Path

The launcher must expose a POST action for trusted requests from `tauler_tutor`.

This path lets a tutor send invitations from the `Autoritzacions` table without requiring the family/student to first open the launcher GET page manually.

The path must not replace the public GET flows. It is an additional entry route into the same secure email-token process.

### Security

Because the launcher deployment is public, panel-initiated POST requests must include a shared internal secret.

Required script property in both `tauler_tutor` and `form_launcher_example`:

| Property | Meaning |
| --- | --- |
| `launcher_internal_secret` | Shared secret used only for trusted server-to-server panel invitation requests. |

Rules:

- The secret must never be hardcoded.
- The secret must never be sent to the browser.
- The secret must never be logged.
- If the property is missing or mismatched, the launcher must reject the request.
- This secret protects only the panel-initiated POST action; the public GET token-verification flows remain public by design.

### Request

The tutor panel sends JSON to the launcher:

```json
{
  "action": "panel_invite",
  "secret": "script-property-value",
  "target": "parents",
  "tutor_email": "teacher@iernestlluch.cat",
  "student": {
    "id": "DIN-A-000000",
    "name": "Student name",
    "email": "student@iernestlluch.cat",
    "document": "",
    "studyType": "eso",
    "isAdult": "no",
    "is14Plus": "si"
  },
  "contacts": [
    {
      "id": "DIN-A-000001",
      "name": "Contact name",
      "email": "contact@example.com",
      "phone": ""
    }
  ],
  "authorization": {
    "resposta_id": ""
  }
}
```

Allowed `target` values:

| Value | Meaning |
| --- | --- |
| `parents` | Create and send one parent token email for each valid contact email. |
| `student` | Create and send one student token email to the loaded student email. |

### Parent Target

For `target = parents`:

- Read recipients from `contacts`.
- Skip contacts with blank or invalid email.
- Create one verification token per valid recipient.
- Store `sender = parent`.
- Store `email` as the normalized contact email.
- Store `dinantia_account_id` from contact `id` when available.
- Store `student_id` from `student.id`.
- Store `resposta_id` from `authorization.resposta_id` when available.
- Store metadata containing the selected student context and tutor email.
- Send the same verification email used by the parent flow.

When the parent opens the token, the launcher must continue to the existing parent-token behavior for that one selected student:

- If the student is adult, block parent access.
- If an authorization row already exists, show the read-only version.
- If no row exists and the student is under 18, show the family message and POST-forward button to `auth_form`.

### Student Target

For `target = student`:

- Read recipient email from `student.email`.
- Require a valid `@iernestlluch.cat` email.
- Create one verification token.
- Store `sender = student`.
- Store `email` as the normalized student email.
- Store `student_id` from `student.id`.
- Store `resposta_id` from `authorization.resposta_id` when available.
- Store metadata containing the student context, authorization context, and tutor email.
- Send the same verification email used by the student flow.

When the student opens the token, the launcher must continue to the existing student-token behavior:

- If no authorization row exists and the student is a minor, block and ask for the family form first.
- If an authorization row exists, show the read-only version and the confirmation button when `signatura_alumne` is not true.
- If the student is adult and no row exists, allow the editable form flow for themselves.

### Response

The launcher must return JSON, not an HTML page, for `action = panel_invite`.

Response shape:

```json
{
  "ok": true,
  "sent": 2,
  "skipped": 0,
  "errors": []
}
```

Rules:

- `sent` counts successfully sent emails.
- `skipped` counts recipients intentionally skipped, for example blank or invalid email.
- `errors` contains safe summaries only; it must not include secrets, token hashes, raw tokens, or full payload dumps.
- If all recipients fail, `ok` should be false.

### Token History

Panel-created tokens are written to the same `Autoritzacions` -> `verification_tokens` sheet as public GET-flow tokens.

The tutor panel may read the latest token row per student to display:

- last invitation datetime,
- recipient email,
- sender type,
- status.

The tutor panel must never display `token_hash` or raw token values.

## Production Identity-Verification Flow

The launcher must evolve from a testing POST tunnel into the real family access gateway for the authorization form.

The production launcher has two responsibilities:

1. Verify that the person requesting access controls an email address registered in Dinantia.
2. Send a secure, personal, short-lived access link that lets the verified person continue to the authorization form.

The public launcher URL may be accessed by anyone. This is acceptable only because the first page does not expose student data and the form access flow is protected by email verification and a secure token.

## Production Entry Points

The endpoint must support both GET and POST.

```javascript
function doGet(e)
function doPost(e)
```

### GET Without Token

A plain GET request without a token must render the identity-verification page.

The page must contain:

- The title `Verificació prèvia de la identitat`.
- The full Catalan explanatory text specified below.
- One email textbox.
- One `Continuar` button.
- A data-protection text block.

The page must follow the same visual criteria as the current launcher/form family pages: calm school-administration UI, centered readable content, restrained colors, good mobile layout, no decorative excess, and a clear primary action.

### GET With Token

A GET request with a verification token must render a fast loading shell first.

The loading shell must:

- Show a centered loading indicator immediately.
- Use `google.script.run` or an equivalent async Apps Script call to resolve the token after the visible shell has rendered.
- Show a friendly Catalan timeout/failure message if the async resolver does not return in a reasonable time.

The async resolver must validate the token.

If valid, it must render the existing family message with the `EMPLENAR EL FORMULARI` button.

If invalid, expired, already used, revoked, or malformed, it must render a clear Catalan error page and must not render the form-forwarding button. User-facing messages must not mention internal token terminology.

The token-opening path must be optimized for user navigation. It must not perform sheet-wide maintenance such as expiring all old tokens, rebuilding caches, or scanning unrelated student sheets when equivalent trusted context is already present in the token metadata.

Required friendly meanings:

| Condition | User-facing meaning |
| --- | --- |
| Already used | `Aquest enllaç ja s'ha utilitzat. Si necessiteu tornar a accedir al formulari, torneu a iniciar el procés o demaneu un nou enllaç al centre.` |
| Expired | `Aquest enllaç ha caducat. Torneu a iniciar el procés per rebre un nou enllaç. Si teniu qualsevol dubte, poseu-vos en contacte amb el centre.` |

### POST From Verification Page

The verification page submits the email address to the launcher.

The launcher must:

1. Normalize and validate the submitted email address.
2. Search the email in Dinantia through the Dinantia API.
3. If not found, show the not-registered error page.
4. If found, generate a secure verification token.
5. Send an email to the submitted address with a personal verification link.
6. Show a neutral confirmation page telling the user to check their mailbox.

The response for a found email should not expose student/form data in the browser before email verification is completed.

## Identity-Verification Page Text

The GET page without token must show this text in Catalan:

```text
Verificació prèvia de la identitat

Benvolguda família,

Per tal de poder accedir al formulari d'autoritzacions, declaracions i comunicacions, és necessari verificar prèviament la identitat de la persona que l'emplenarà.

Aquest procés ens permet garantir que només el pare, la mare, el tutor o la tutora legal de l'alumne/a (o el mateix alumne/a, quan sigui major d'edat) pot accedir a les seves dades personals, efectuar les declaracions corresponents i signar les autoritzacions requerides.

Per començar, introduïu la vostra adreça de correu electrònic al camp inferior i premeu el botó «Continuar».

Si l'adreça introduïda correspon a una persona autoritzada, rebreu en pocs instants un missatge de correu electrònic amb un enllaç personal i segur de verificació.

Una vegada hàgiu confirmat la vostra identitat mitjançant aquest enllaç, podreu accedir al formulari i completar-lo amb totes les garanties de seguretat.

Important: si no rebeu el correu electrònic al cap d'uns minuts, reviseu també la carpeta de correu brossa o correu no desitjat. Si després de revisar-la continueu sense haver-lo rebut, poseu-vos en contacte amb el centre.

Correu electrònic

Introduïu l'adreça de correu electrònic amb la qual el centre es comunica habitualment amb la vostra família.

[ email textbox ]

[ Continuar ]

Protecció de dades

L'adreça de correu electrònic facilitada s'utilitzarà exclusivament per verificar la vostra identitat, permetre l'accés segur al formulari i enviar-vos les comunicacions necessàries relacionades amb aquest procés. Les dades seran tractades pel centre educatiu d'acord amb la normativa vigent en matèria de protecció de dades personals i no s'utilitzaran per a finalitats diferents de les derivades de la gestió administrativa i educativa del centre.
```

Visible form controls:

| Control | Requirement |
| --- | --- |
| Email textbox | Required, type `email`, labeled `Correu electrònic`. |
| Continue button | Primary action, text `Continuar`. |

## Dinantia Email Lookup

The submitted email must be searched in Dinantia using the Dinantia API.

Rules:

- Credentials must be read from script properties, never hardcoded.
- Use the existing Dinantia credential property names already established for this app family: `dinantia_api_user` and `dinantia_api_secret`.
- Normalize the email before lookup by trimming whitespace and lowercasing.
- Do not show raw Dinantia errors to the family.
- Log only safe diagnostic summaries when needed.

### Email Not Found

If the email is not registered in Dinantia, render a simple empty-state page with a clear Catalan message.

Required meaning:

```text
L'adreça de correu electrònic introduïda no consta registrada a Dinantia.

Utilitzeu una adreça de correu electrònic registrada al centre, o poseu-vos en contacte amb l'institut si teniu dubtes.
```

The page must not reveal whether the email belongs to a specific student, family, group, or role.

### Email Found

If the email is found in Dinantia, the launcher must send a verification email to that same address.

The browser response should be a neutral confirmation page, for example:

```text
Si l'adreça indicada correspon a una persona autoritzada, rebreu un correu electrònic amb l'enllaç de verificació.
```

This neutral wording is preferred even when the lookup succeeds, because it reduces user-enumeration risk.

## Secure Token Strategy

The verification email must not contain editable hidden form data as the security mechanism.

Instead, the launcher must use a secure token.

### Token Contents

The token must be tied to the verified request context, including at least:

| Value | Meaning |
| --- | --- |
| Contact email | Normalized verified email address. |
| Dinantia contact/account ID | Dinantia account found for the submitted email. |
| Student/form context | Student ID and prefill fields if already known from the original launch context. |
| Expiry timestamp | Absolute expiry datetime, currently 24 hours after creation. |
| Nonce | Random UUID or cryptographically strong random value. |

If the launcher is opened directly by GET without student context, the later implementation must define how student/form context is resolved before rendering the final form-forwarding button. The launcher must not guess student identity from email alone unless a later spec defines that relationship unambiguously.

### Token Storage Option

Required approach for this project: use the registry-backed sheet `Autoritzacions` -> `verification_tokens` as the server-side token store.

- Store only a hash of the token, not the raw token.
- Store metadata needed to render the final form-forwarding page.
- Store creation datetime, expiry datetime, used/revoked state, and safe audit fields.
- Mark token as used after successful verification if the selected policy is one-time use.
- Mark expired pending tokens as `expired` opportunistically during token creation, scheduled maintenance, or explicit admin/cache jobs.
- Do not run full expired-token cleanup during `GET ?token=...`, token validation, or form-forwarding POSTs. Those paths must only validate the current token row and, if the current token itself is expired, mark that row as expired.

A stateless signed token may be used only as an additional integrity layer, not as the primary persistence strategy. The authoritative token state is `Autoritzacions` -> `verification_tokens`.

### Verification Token Sheet

The launcher must store verification-token metadata in `Autoritzacions` -> `verification_tokens`.

Required headers:

| Header | Meaning |
| --- | --- |
| `id` | Unique token record identifier. |
| `created_at` | Token creation datetime. |
| `expires_at` | Token expiry datetime. |
| `used_at` | Token use datetime, blank while pending. |
| `token_hash` | Hash of the raw token. |
| `sender` | `parent` or `student`. |
| `email` | Normalized verified email. |
| `dinantia_account_id` | Dinantia account/contact ID when applicable. |
| `student_id` | Student ID tied to the token. |
| `resposta_id` | Existing authorization response ID when applicable. |
| `status` | `pending`, `used`, `expired`, or `revoked`. |
| `metadata_json` | JSON context used to render the verified step. |

The raw token must never be written to the sheet.

### Token Lifetime

Current lifetime: 24 hours.

The exact value can be adjusted later, but tokens must not be indefinite.

### One-Time Use

Preferred behavior: one-time use.

After the verified link has been used to render the final launcher page, the token should be marked as used. Expired pending tokens should be marked as `expired`.

## Verification Email

When the email is found and the token is generated, the launcher sends an email to the submitted address.

The email must contain the same family message already used in the launcher, with the same tone and same `EMPLENAR EL FORMULARI` call to action.

In production, the call to action should first open the launcher verification link containing the secure token. After the token is validated, the launcher renders the final page with the POST button to `auth_form`.

Do not place the raw form POST payload directly in the email.

Rules:

- Include the student full name in the subject when a single target student is known.
- Include the student full name in the email body when a single target student is known.
- State that the secure link is valid for 24 hours.
- If a parent has multiple children and no student has been selected yet, the initial verification email may omit a student name. After selection, every form-forwarding context must be tied to the selected student.

## Final Verified Launcher Page

After token validation, the launcher renders the existing family message:

- Same text as the current testing launcher message.
- Same `EMPLENAR EL FORMULARI` button.
- The button sends a POST request to `auth_form`.
- Hidden inputs are generated server-side from the verified token metadata, not from editable browser-provided fields.

For panel-created invitations, the token metadata should already contain normalized student context from the tutor-panel cache. In that case, the launcher must reuse that metadata instead of re-opening `Dades alumnes` only to enrich the same student again. `Dades alumnes` lookup is a fallback for older/manual tokens or incomplete metadata.

The final POST-forwarding page is a transport layer, not a user-facing step. It should render minimal HTML and submit to `auth_form` immediately, with no visible content during the normal path. If the browser does not navigate quickly, reveal a small fallback page with `Obrint el formulari...` and a manual `Obrir formulari` button.

Forwarded fields remain:

| Forwarded field | Meaning |
| --- | --- |
| `id_student` | Student identifier. |
| `alumne_nom` | Student full name. |
| `alumne_document` | Student document when available. |
| `studyType` | Student studies value. |
| `isAdult` | Adult-status value. |
| `is14Plus` | Optional ESO age value. |

## Security Requirements For Production

- The public GET page must not expose student data.
- The email lookup must not leak sensitive relationship data.
- Verification links must be signed or backed by a server-side token store.
- Tokens must expire. Current lifetime is 24 hours.
- Tokens should be one-time use unless a temporary testing exception is documented.
- Expired or already-used tokens must be shown as friendly Catalan link-status messages.
- Hidden POST fields to `auth_form` must be produced only after token validation.
- The launcher must not trust student/form fields submitted by an unauthenticated browser request.
- All rendered values must be HTML-escaped.
- Script properties and API secrets must never be rendered or logged.
- `.clasp.json` and local credentials must remain out of git.

## Legacy Testing Tunnel

Historically, `form_launcher_example` started as a temporary tunnel between `tauler_tutor` and `auth_form`.

It receives a POST request from the tutor panel for one student, renders the message that will eventually be emailed to the family, and provides an `EMPLENAR EL FORMULARI` button.

When clicked, that button submits a POST request to the real authorization form endpoint with hidden inputs.

This legacy tunnel is superseded by the secure token flows above. It may remain as a reference for the final verified POST-forwarding page, but production invitation behavior must use verification tokens.

## Legacy Testing Behavior

In the current development/testing phase, the launcher must:

1. Receive a POST request from `tauler_tutor`.
2. Read student, first-contact, and form-prefill fields from the POST body.
3. Render a page showing the family message.
4. Render `EMPLENAR EL FORMULARI` as a button.
5. When clicked, submit a POST request to the `auth_form` endpoint.
6. Forward the relevant student/form-prefill values to `auth_form` as hidden fields.

This behavior is no longer the preferred production path.

## Previous Future Production Note

The production behavior is now specified above in `Production Identity-Verification Flow`. The older testing tunnel remains useful as a reference for the final verified page that POST-forwards to `auth_form`.

## Entry Point

The endpoint must support:

```javascript
function doPost(e)
```

`doGet()` may show a simple diagnostic or unsupported-method page, but launch behavior is POST-only.

## Incoming POST Payload

The launcher receives a POST request for exactly one student and the student's first contact.

Required contact fields:

| Field | Meaning |
| --- | --- |
| `contact_name` | First contact full name. |
| `contact_phone` | First contact phone. |
| `contact_email` | First contact email. |

Required student and form-prefill fields:

| Field | Meaning |
| --- | --- |
| `student_id` | Student identifier from the tutor panel. This maps to `auth_form.id_student`. |
| `alumne_nom` | Student full name. |
| `alumne_document` | Student DNI/NIE/passport or equivalent document. |
| `studyType` | Student studies: `eso`, `batx`, or `fp`. |
| `isAdult` | Whether the student is adult: `si` or `no`. |

Optional form-prefill field:

| Field | Meaning |
| --- | --- |
| `is14Plus` | Whether an ESO student is 14 or older: `si` or `no`. |

Optional context fields:

| Field | Meaning |
| --- | --- |
| `tutor_email` | Email of the tutor who launched the form request. |
| `student_name` | Alias for `alumne_nom`, accepted for launcher readability. |

Rules:

- `student_id` must be forwarded to `auth_form` as `id_student`.
- `alumne_nom`, `alumne_document`, `studyType`, `isAdult`, and `is14Plus` must be forwarded unchanged after basic trimming/normalization.
- Contact fields are used by the launcher message context and testing, but are not part of the `auth_form` prefill contract unless later specified.
- Unknown incoming fields should be ignored unless later specs define them.

## Rendered Message

The launcher page must show this Catalan message text:

```text
Benvolguda família,

Per tal d'iniciar correctament el curs escolar i mantenir actualitzada la informació de l'alumnat, us demanem que empleneu el formulari d'autoritzacions, declaracions i comunicacions corresponent al vostre fill o filla.

En aquest formulari podreu:

revisar i actualitzar les dades bàsiques;
autoritzar les diferents activitats i serveis del centre;
indicar persones autoritzades per recollir l'alumne/a;
facilitar la informació sanitària rellevant;
signar electrònicament les autoritzacions.

Per accedir al formulari, feu clic al següent botó:

EMPLENAR EL FORMULARI

Temps aproximat: 10 minuts.

És important que el formulari sigui emplenat abans del dia 01/10/2026, ja que aquesta informació serà utilitzada durant tot el curs escolar.

Les dades facilitades seran tractades exclusivament per a finalitats educatives i administratives, d'acord amb la normativa vigent en matèria de protecció de dades personals.

Si teniu qualsevol incidència tècnica o dubte sobre el formulari, podeu contactar amb el centre a través del correu:

e3009850@xtec.cat

Moltes gràcies per la vostra col·laboració.

Cordialment,

Equip Directiu
Institut Ernest Lluch
Cunit
```

The displayed `EMPLENAR EL FORMULARI` text must be a button, not plain text.

The button may include the visual arrow/hand cue near the button text, but the POST form submit control must be accessible without relying on that symbol.

## Forwarding Button

The button must be implemented as an HTML form submit action:

```html
<form method="post" action="FORM_ENDPOINT_URL">
  <input type="hidden" name="id_student" value="...">
  <input type="hidden" name="alumne_nom" value="...">
  <input type="hidden" name="alumne_document" value="...">
  <input type="hidden" name="studyType" value="...">
  <input type="hidden" name="isAdult" value="...">
  <input type="hidden" name="is14Plus" value="...">
  <button type="submit">EMPLENAR EL FORMULARI</button>
</form>
```

`FORM_ENDPOINT_URL` must point to the deployed `auth_form` endpoint.

In the legacy tunnel, because the launcher is only a tunnel, it should not save any submitted values to script properties, spreadsheets, Drive, or local storage.

## Field Mapping To `auth_form`

| Launcher input | Forwarded field to `auth_form` |
| --- | --- |
| `student_id` | `id_student` |
| `alumne_nom` | `alumne_nom` |
| `student_name` | `alumne_nom`, only if `alumne_nom` is missing. |
| `alumne_document` | `alumne_document` |
| `studyType` | `studyType` |
| `isAdult` | `isAdult` |
| `is14Plus` | `is14Plus` |

Contact fields are not forwarded to `auth_form` in the current version.

## Validation

The launcher should validate the incoming POST enough to avoid rendering a broken form-forwarding page.

Required for forwarding:

- `student_id`
- `alumne_nom` or `student_name`
- `studyType`
- `isAdult`

If required data is missing, the endpoint must show a clear Catalan error page and must not render the forwarding button.

`alumne_document` may be blank if the source data does not have it, but it should still be forwarded as an empty hidden input.

`is14Plus` may be blank unless `studyType` is `eso` and `isAdult` is `no`; in that case the form endpoint can still ask the user to complete it.

## Security And Privacy

The launcher handles personal data and must be treated as sensitive.

Rules:

- Do not log full contact or student payloads unless explicitly needed for debugging.
- Do not expose script properties or endpoint secrets in the page.
- Escape all rendered POST values before inserting them into HTML.
- Keep `.clasp.json` ignored and out of git.
- The launcher must not persist personal data in this testing version.

## Out Of Scope For Current Version

This endpoint does not:

- Send real emails.
- Store launch history.
- Store contact data.
- Read from the database registry.
- Validate authorization submissions.
- Write to `Autoritzacions` sheets.
