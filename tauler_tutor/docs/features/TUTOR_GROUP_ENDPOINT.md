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
| `Dinantia` | `changelog` | Append audit rows for teacher-made data changes. |
| `Dades alumnes` | Dynamic sheet from `class_groups.dades_alumnes_sheet` | Read local student birthdate by Dinantia student ID. |

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
12. Read `class_groups.dades_alumnes_sheet` as the sheet name inside the `Dades alumnes` spreadsheet.
13. Fetch students from Dinantia.
14. Open the `Dades alumnes` spreadsheet through the registry.
15. Open the group-specific sheet named by `dades_alumnes_sheet`.
16. Match Dinantia students to local `Dades alumnes` rows by Dinantia account `id` to local column `ID`.
17. Read `Data Naixement` from the matched local row.
18. Show the main page.

String comparisons should trim surrounding whitespace.

Teacher code comparisons must use `codeKey_` as defined in `docs/DB_STRUCTURE.md`.

The app must keep both identities when the accessing teacher is a substitute:

- Accessing teacher: the teacher found directly by `CORREU INSTIT`.
- Main teacher: the teacher resolved through `leave_absence.teacher_code`.

The main teacher is used to resolve `carrecs.asignado?` and the Dinantia group.

The accessing teacher is used for the visible teacher label on the main page.

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

The resolved view model must retain:

- Substitute teacher full name.
- Main teacher full name.
- Main teacher row used for `carrecs` lookup.

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
- The matched class group has no `dades_alumnes_sheet`.
- The referenced `Dades alumnes` sheet does not exist.

Internal logs may include more specific diagnostic context, but the page shown to the user should use the message above.

## Main Layout

If tutor group resolution succeeds, the endpoint must render a page with:

- A left menu.
- A main content area.

Left menu options:

| Label | Link |
| --- | --- |
| `Inici` | Default/current main page. |
| `Contactes` | Client-side contacts page. |
| `Autoritzacions` | `#` |

`Inici` is shown by default.

## Inici Page

The `Inici` page must show:

1. The Dinantia group ID as the page title.
2. A table with all students in the group.

The title uses the group ID directly from `Dinantia` -> `class_groups`.`dinantia_group_name`.

Do not call the Dinantia Groups API to convert the group ID to name or tag in this version.

Do not show the label `GRUP DINANTIA` above the title.

### Teacher Label

The main page must show the teacher label below or near the group title.

If the accessing teacher is not a substitute, show the accessing teacher full name.

Example:

```text
Mikel López Villarroya
```

If the accessing teacher is a substitute, show the substitute teacher full name first, followed by the main teacher full name in parentheses.

Format:

```text
{substitute full name} (substituïnt {main teacher full name})
```

Example:

```text
Mikel López Villarroya (substituïnt Ester Borrull Blanes)
```

In this substitute case:

- The group lookup still uses the main teacher.
- The visible teacher label uses the substitute teacher first.

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

## Local Student Data

Student birthdate comes from the `Dades alumnes` spreadsheet, not from Dinantia.

Resolution process:

1. Use the resolved `class_groups.dades_alumnes_sheet` value.
2. Open the logical table `Dades alumnes` through the registry.
3. Inside the `Dades alumnes` spreadsheet, open the sheet named by `dades_alumnes_sheet`.
4. Validate required headers:
   - `ID`
   - `Data Naixement`
5. Build a local lookup where `ID` is the key.
6. For each Dinantia student, match Dinantia account `id` to local `ID`.
7. Use the local `Data Naixement` value as the student's birthdate.

If a Dinantia student has no matching local row in `Dades alumnes`, show the student name and leave birthdate blank.

## Student Table

The student table must show:

| Column | Source |
| --- | --- |
| Name | Dinantia account `name`. |
| Birthdate | `Dades alumnes` group sheet `Data Naixement`, matched by local `ID` to Dinantia account `id`. |
| Age | Calculated dynamically from birthdate and today. |

Name must be shown exactly as it appears in Dinantia.

Do not split the Dinantia account `name` into first name and surnames in this version.

The birthdate column should be shown because `Data Naixement` is part of the `Dades alumnes` group sheet contract.

If a specific student has no local `Data Naixement`, leave that student's birthdate cell blank.

Age rules:

- Age is shown as full years only.
- Age is calculated from `Data Naixement`.
- Today is evaluated in Apps Script timezone `Europe/Madrid`.
- If a student has no valid birthdate, leave the age cell blank.

Sorting rules:

- The default order is by visible Dinantia `name`, ascending A-Z.
- Column headers must be clickable.
- Clicking `Name` sorts by visible Dinantia `name`.
- Clicking `Birthdate` sorts by birthdate.
- Clicking `Age` sorts by calculated age.
- Repeated clicks on the same sortable header toggle ascending/descending order.

## Contactes Page

The left menu entry formerly named `Telèfons` must be renamed to `Contactes`.

The page title must also be `Contactes`.

The `Contactes` page works with the same resolved student list used by `Inici`.

It must not re-run the tutor resolution or group database lookup just to render contacts.

### Contact Source

Contacts come from Dinantia parent accounts related to each student.

For each Dinantia student:

1. Read the student's `parents` array from the Dinantia Account object.
2. Fetch or resolve every parent/contact account listed in that array.
3. Render one table row for each contact.
4. If a student has no contacts, render one row for the student and show `-` in the contact cells.

### Contactes Table

The table has 4 visible columns total:

1. Student name.
2. Contact name.
3. Contact email.
4. Contact phone.

Header row:

| Column | Header |
| --- | --- |
| Student name | `Alumne` |
| Contact name | `Nom` |
| Contact email | `Email` |
| Contact phone | `Telèfon` |

Rows must use a white-grey alternating pattern by student, not merely by row, so contacts belonging to the same student share the same background color.

### Contact Editing

Contact fields are editable:

- Contact name.
- Contact phone.
- Contact email.

Student name is not editable.

When any editable cell in a row changes:

- Mark the row as dirty.
- Show the entire row with orange background until it is saved.

### Saving Contact Changes

The page must show a floating save button in the bottom-right corner.

The save button must use a 3.5-inch disk/save icon.

When saving:

- Disable/block the save button immediately.
- Prevent duplicate saves while a save is in progress.
- Update the relevant Dinantia parent/contact account through `POST /v1.2/accounts/update/:id`.
- Phone values must be sent to Dinantia in valid international/E.164 style.
- Spanish 9-digit local phone numbers such as `686123456` should be normalized to `+34686123456` before calling Dinantia.
- Empty phone values are valid and mean the phone number should be removed from the contact.
- Empty email values are valid and mean the email should be removed from the contact.
- Non-empty phone and email values must be validated in JavaScript before calling the API.
- Invalid phone or email values must block saving and show feedback to the user.
- Restore normal row background after the row is saved successfully.
- Keep or restore dirty state if saving fails.
- Show useful error feedback if the save fails.

### Contact Changelog

Every saved contact edit must append a row to `Dinantia` -> `changelog`.

For contact edits:

- `student_id` is the Dinantia student account `id`, even though the edited data belongs to a parent/contact account.
- `user_mail` is `Session.getActiveUser().getEmail()`.
- `datetime` is generated by the app in timezone `Europe/Madrid`.
- `old_value` and `new_value` are the field values before and after the edit.

Allowed `field_changed` values for contact edits follow a controlled pattern:

| Field name | Meaning |
| --- | --- |
| `Contact{n}Name` | Contact/parent name, where `{n}` is the 1-based contact position for that student. |
| `Contact{n}Phone` | Contact/parent phone, where `{n}` is the 1-based contact position for that student. |
| `Contact{n}Email` | Contact/parent email, where `{n}` is the 1-based contact position for that student. |

## Loading Indicator

Every process that involves data loading must notify the user with a loading indicator.

The loading indicator should be a typical animated loading GIF/icon centered in the page or active content area.

Loading states apply to:

- Initial endpoint data loading.
- Contact account loading.
- Save operations that fetch or refresh data.

To show the loading indicator on first access, the endpoint must render the page shell first and load tutor/student/contact data asynchronously from the client.

The initial page shell must be visible immediately with the loading indicator centered while data is fetched.

## Changelog

When this endpoint grows to support teacher edits, each saved change must append a row to `Dinantia` -> `changelog`.

Changelog columns:

| Header | Value source |
| --- | --- |
| `id` | Autonumeric changelog row ID. |
| `datetime` | Current Apps Script datetime in timezone `Europe/Madrid`. |
| `user_mail` | `Session.getActiveUser().getEmail()`. |
| `field_changed` | Controlled field name from an app-level constant/list. |
| `old_value` | Value before the edit. |
| `new_value` | Value after the edit. |
| `student_id` | Dinantia student account `id`. |

The changelog must be append-only.

Editable fields must use controlled field names. Initial known field name:

| Field name | Meaning |
| --- | --- |
| `Birthdate` | Student birthdate from `Dades alumnes`.`Data Naixement`. |

If a future editable field does not clearly match an existing field name, stop and define the new field name before implementing that edit.

## Out Of Scope For This Version

- Mapping local teachers to Dinantia `account_id`.
- Showing Dinantia group name or tag instead of group ID.
- Implementing `Autoritzacions`.
- Sending messages or notifications through Dinantia.
