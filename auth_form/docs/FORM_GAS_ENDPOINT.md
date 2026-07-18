# Form GAS Endpoint Specification

This document specifies the current Google Apps Script web endpoint for `auth_form`.

This is a documentation/specification file. Do not deploy or sync from this document without an explicit later instruction.

## Purpose

The endpoint serves a multilingual authorization form for students and families.

The form lets the user:

- Select the applicable authorization model from basic student context.
- Fill authorization, declaration, communication, health, and signature fields.
- Change the visible language without reloading the page.
- Save and restore a local browser draft.
- Download the filled data as JSON.
- Print or save the rendered form as PDF through the browser.

The current endpoint is a client-side form experience. It does not persist submissions to the school database, Google Sheets, Drive, or Dinantia.

## Deployment And Access

The Apps Script project is configured as a web app.

Required manifest settings:

| Setting | Required value |
| --- | --- |
| Runtime | V8 |
| Timezone | `Europe/Madrid` |
| Execute as | Deploying user |
| Access | Domain users |

The endpoint entry point is:

```javascript
function doGet()
```

`doGet()` must render `Index.html` as a template and set:

- Page title: `Autoritzacions, declaracions i comunicacions`
- Viewport meta tag for responsive layout.
- `XFrameOptionsMode.ALLOWALL`, matching the current project behavior.

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `Code.gs` | Server entry point and HTML partial include helper. |
| `Index.html` | Main HTML structure and form markup. |
| `Styles.html` | CSS styles for screen and print. |
| `App.html` | Client-side form behavior, model selection, validation, signatures, local save/restore, and JSON export. |
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
- Preserve form fields and signatures when the language changes.
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
- Whether student signature is shown.
- Whether ESO exit authorization is shown.
- Whether recess exit authorization is shown.
- Whether academic communication authorization is shown.
- Whether municipal trips authorization is shown.
- Whether health communication consent is shown.
- Whether paracetamol authorization is shown.
- Whether TIS is included in the student document label.

## Client-Side Data Handling

The endpoint currently stores data only in the user's browser unless the user downloads or prints it.

Supported browser actions:

| Action | Behavior |
| --- | --- |
| Save local draft | Serializes the form to `localStorage`. |
| Restore local draft | Reads the saved object from `localStorage` and fills the form. |
| Download JSON | Downloads the serialized form object as a `.json` file. |
| Print / Save PDF | Uses the browser print flow. |
| Validate form | Runs HTML form validation and focuses the first invalid field when possible. |

The local draft key is currently:

```text
autoritzacionsForm5Models
```

The selected language key is currently:

```text
autoritzacionsIdioma
```

## Signatures

The form has canvas-based signature pads.

Rules:

- Signature canvases must support pointer input.
- Signature canvas dimensions must adapt to device pixel ratio.
- Signature fields must be serialized as PNG data URLs only when the selected model requires that signature.
- Hidden signature blocks must clear or omit their signature data.
- Clear buttons must clear the relevant canvas.

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
- Read from `tauler_tutor` databases.
- Save submissions to a spreadsheet.
- Save generated PDFs to Drive.
- Send emails.
- Call Dinantia.
- Register changelog entries.

These behaviors may be specified later if the form becomes connected to the tutor dashboard or school database.
