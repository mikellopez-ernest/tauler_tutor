# Tutor Group Endpoint

This document specifies the first GAS web endpoint for tutors.

This is a specification only. Do not implement, deploy, or sync from this document without an explicit later instruction.

## Purpose

The endpoint gives a logged-in school user access to the student group associated with their tutoring responsibility.

On access, the app resolves the current user's email against the teacher database, finds the tutor responsibility, maps it to a Dinantia group ID, and displays the students in that group.

## Deployment And Access

The GAS web app must be deployed with these access properties:

| Setting | Required value |
| --- | --- |
| Execute as | User creator / owner: `admindomini@iernestlluch.cat` |
| Access | Only users in the `iernestlluch.cat` domain |

The app identifies the current user with:

```javascript
Session.getActiveUser().getEmail()
```

The app must reject or fail clearly if the current user email is missing or blank.

## Required Script Properties

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |
| `dinantia_api_user` | Dinantia API Basic Auth user. |
| `dinantia_api_secret` | Dinantia API Basic Auth secret. |

Missing or blank required properties must produce clear configuration errors.

## Data Sources

The endpoint uses the registry-backed database structure documented in `docs/DB_STRUCTURE.md`.

Required sheets:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Dades de professors` | `Llista` | Find teacher by institutional email and resolve teacher full name. |
| `Dades de professors` | `leave_absence` | Resolve substitute teachers to the main teacher they are covering. |
| `Càrrega lectiva` | `carrecs` | Find tutor responsibility from teacher full name. |
| `Dinantia` | `class_groups` | Map tutor responsibility to Dinantia group ID. |

Required Dinantia API endpoint:

| Endpoint | Purpose |
| --- | --- |
| `GET /v1.2/accounts/index` | Retrieve accounts and filter students by group membership. |

## Tutor Resolution Flow

The endpoint must resolve the tutor group with this process:

1. Read the current user's email with `Session.getActiveUser().getEmail()`.
2. Find a row in `Dades de professors` -> `Llista` where `CORREU INSTIT` matches the current user's email.
3. If no teacher row is found, render the error page.
4. If the teacher row has `SUBST?` not true, use that teacher row.
5. If the teacher row has `SUBST?` true, resolve the main teacher through `leave_absence`.
6. Build the effective teacher full name as `NOM COGNOM1 COGNOM2`, omitting blanks.
7. Find a row in `Càrrega lectiva` -> `carrecs` where `asignado?` matches the effective teacher full name.
8. If no `carrec` row is found, render the error page.
9. Find a row in `Dinantia` -> `class_groups` where `tutor_carrec` matches `carrecs.carrec`.
10. If no `class_groups` row is found, render the error page.
11. Read `class_groups.dinantia_group_name` as the Dinantia group ID.
12. Fetch students from Dinantia and show the main page.

String comparisons should trim surrounding whitespace.

Teacher code comparisons must use `codeKey_` as defined in `docs/DB_STRUCTURE.md`.

## Substitute Resolution

If the teacher found by `CORREU INSTIT` has `SUBST?` true:

1. Read the substitute teacher code from `Llista.REDUÏT`.
2. Search `Dades de professors` -> `leave_absence`.
3. Match `leave_absence.substitute_code` to the substitute `REDUÏT`.
4. The leave row is active when:
   - `start_date` is on or before today.
   - `end_date` is blank or on or after today.
5. If no active leave row satisfies these conditions, render the error page.
6. If an active leave row is found, read `leave_absence.teacher_code`.
7. Find the main teacher in `Llista` by matching `teacher_code` to `Llista.REDUÏT`.
8. Continue the tutor resolution flow with the main teacher row.

Today must be evaluated in the Apps Script timezone `Europe/Madrid`.

## Error Page

If the current user cannot be resolved to a tutor group, the endpoint must show an error page.

Error message:

```text
Sembla que el teu correu no correspon a cap tutoria. En cas que hi hagi un error, contacta amb el cap d'estudis
```

This user-facing message applies when:

- The current user email is not found in `Llista`.
- The matched teacher is a substitute but has no active `leave_absence` row.
- The matched teacher is a substitute and the main teacher cannot be resolved.
- The effective teacher has no matching `carrecs.asignado?`.
- The `carrec` has no matching `class_groups.tutor_carrec`.
- The matched class group has no Dinantia group ID.

Internal logs may include more specific diagnostic context, but the page shown to the user should use the message above.

## Main Layout

If tutor group resolution succeeds, the endpoint must render a page with:

- A left menu.
- A main content area.

Left menu options:

| Label | Link |
| --- | --- |
| `Inici` | Default/current main page. |
| `Telèfons` | `#` |
| `Autoritzacions` | `#` |

`Inici` is shown by default.

## Inici Page

The `Inici` page must show:

1. The Dinantia group ID as the page title.
2. A table with all students in the group.

The title uses the group ID directly from `Dinantia` -> `class_groups`.`dinantia_group_name`.

Do not call the Dinantia Groups API to convert the group ID to name or tag in this version.

## Student Fetching

The endpoint must use Dinantia credentials from script properties and call:

```text
GET /v1.2/accounts/index
```

The API call must:

- Use Basic Authentication.
- Include required Dinantia JSON API headers.
- Handle pagination.
- Use `limit=100` when fetching account pages.

Students are selected from the returned accounts where:

- `roles` contains `Student`.
- `groups.member` contains the resolved Dinantia group ID.

## Student Table

The student table must show:

| Column | Source |
| --- | --- |
| Name | Dinantia account `name`. |
| Birthdate | Dinantia birthdate field, only if available. |

Name must be shown exactly as it appears in Dinantia.

Do not split the Dinantia account `name` into first name and surnames in this version.

If birthdate is not available in the Dinantia account data or custom fields, omit the birthdate column and show only the name.

## Out Of Scope For This Version

- Mapping local teachers to Dinantia `account_id`.
- Showing Dinantia group name or tag instead of group ID.
- Implementing `Telèfons`.
- Implementing `Autoritzacions`.
- Editing or writing any database values.
- Sending messages or notifications through Dinantia.

