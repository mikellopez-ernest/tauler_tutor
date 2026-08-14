# Only Contacts

Google Apps Script project for the `only_contacts` app.

This folder is connected to Apps Script project:

```text
1oBPSQB3zJrpRHcGpbdeSs04fGjCd8SUGYwn-tASEEsFddlABsOjW4h2X
```

Latest synced clasp deployment:

```text
AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @7
```

Deployment note: create or confirm the public web app deployment in the Apps Script UI with:

- Type: `Web app`
- Execute as: `Me / creator`
- Access: `Anyone`

After the final public web app URL is known, update this README and the root workspace README if the URL needs to be tracked.

## Purpose

This app exposes a public read-only contacts endpoint.

The web app executes as the creator account and is accessible to anyone with the URL. It reads `Dinantia` -> `contacts_cache` through the registry spreadsheet and renders a read-only contacts table.

The app uses the same `SpreadsheetApp` registry/cache access pattern as `tauler_tutor`. The endpoint is read-only at the application level: it renders contact data as plain text and exposes no editing or write actions.

The group selector is generated from the loaded `Dinantia` -> `contacts_cache`.`group_name` values. It shows groups that currently have cached contact rows. A configured group will not appear if there are no rows for that group in `contacts_cache`.

## Structure

```text
only_contacts/
  README.md
  docs/
    ONLY_CONTACTS.md
  appsscript.json
  Code.js
  Config.js
  Database.js
  Index.html
  Styles.html
  Client.html
```

## Security

Do not commit `.clasp.json`, Apps Script credentials, script properties, Dinantia credentials, launcher secrets, verification tokens, or any other private operational data.

The root `.gitignore` already ignores `.clasp.json` at every level.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

## Development

Run clasp commands from this folder:

```bash
cd only_contacts
clasp push
```

Deploy only when explicitly requested.

If scopes change, open the Apps Script editor and run `authorizeOnlyContactsServices()` once manually to grant the new permissions for the creator/deployer account.

Latest synced clasp deployment:

```text
AKfycbymAatPjttACa4C91C7W7RoWVhJYUvjy24PLECz0PA1CSKksA7FGvtNoh-YGi1Lc1sX @7
```

## Diagnostics

If the public page cannot load contacts, run this function manually from the Apps Script editor:

```javascript
authorizeOnlyContactsServices()
```

It checks whether `db` exists, the registry is readable, `Dinantia` is registered, `contacts_cache` exists, required headers are present, and how many cache rows are readable.

For a diagnostic report without the authorization-oriented wrapper, run:

```javascript
diagnoseOnlyContactsSetup()
```
