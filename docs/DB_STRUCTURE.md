# Database Structure

This document describes the database structure used by the app. The app must treat database locations as configurable data, not as hardcoded connector configuration.

## Script Property

The Apps Script project must define a script property named `db`.

| Property | Meaning |
| --- | --- |
| `db` | Spreadsheet ID of the database registry spreadsheet. |

The app reads this value from script properties. If the property is missing, blank, or only whitespace, the app must stop with a clear configuration error.

Apps Script access pattern:

```javascript
PropertiesService.getScriptProperties().getProperty('db')
```

## Registry Spreadsheet

The spreadsheet referenced by the `db` script property is the database registry.

It must contain a sheet named `tables`.

| Column | Meaning |
| --- | --- |
| A | Logical table name |
| B | Spreadsheet ID for that logical table |

Each row maps one logical table name to the spreadsheet that stores it. Logical table names are app-level names; spreadsheet IDs are deployment-specific values.

The connector must load this registry dynamically and must not hardcode the mappings.

## Logical Tables

Logical tables represent shared data domains. A logical table may contain one or more sheets inside its mapped spreadsheet.

Current examples:

| Logical table | Example sheet(s) |
| --- | --- |
| `Horaris` | `GPU001` |
| `Dades de professors` | `Llista`, `leave_absence` |
| `Càrrega lectiva` | `assignatures`, `carrecs` |
| `Dinantia` | `class_groups` |
| `Incidències` | `llistat_anual`, `config`, `meeting_records`, `study_group_students`, `study_group_teachers`, `3r_project`, `expulsions` |

These are examples of current shared tables. They may be referenced by app specs, but the connector must still discover their spreadsheet IDs through the registry.

## Generic Connector Responsibilities

The connector should provide generic helpers for opening and validating registry-backed spreadsheets and sheets.

Required helper responsibilities:

| Helper | Responsibility |
| --- | --- |
| `getDatabaseSpreadsheetId_()` | Read and validate script property `db`. |
| `loadTableRegistry_()` | Return a map from logical table name to spreadsheet ID. |
| `openTableSpreadsheet_(tableName)` | Open a logical table spreadsheet through the registry. |
| `openTableSheet_(tableName, sheetName)` | Open a requested sheet inside a requested logical table spreadsheet. |
| `openSheetByName_(spreadsheet, sheetName, context)` | Open a named sheet and produce contextual errors if missing. |
| `getHeaderMap_(sheet)` | Map row-1 header names to zero-based column indexes. |
| `requireHeaders_(sheet, requiredHeaders, context)` | Validate that required row-1 headers exist. |
| `codeKey_(value)` | Normalize short codes for joins and comparisons. |

Errors should include enough context to identify the missing property, registry entry, spreadsheet, sheet, or header.

## Header Convention

Unless a table-specific section states otherwise:

- Row 1 contains headers.
- Data starts in row 2.
- Headers are matched by their exact text.
- Required headers must be validated before reading or writing table data.

## Code Key Normalization

Short codes used for joins must be normalized before comparison.

This applies to teacher codes and similar short-code joins.

Required normalization:

```javascript
function codeKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
```

All teacher-code comparisons must use this normalization.

## Shared Table: `Dades de professors` -> `Llista`

The logical table `Dades de professors` contains a sheet named `Llista`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `ESP` | Original teacher code. |
| `DEPT.` | Department code. |
| `NOM` | First name. |
| `COGNOM1` | First surname. |
| `COGNOM2` | Second surname. |
| `REDUIT` | Short teacher code used by timetable logic. |
| `SITUACIO` | Status text. Do not infer substitute status from this. |
| `JORNADA` | Workload fraction. |
| `DNI` | ID document value. |
| `TELF` | Phone number. |
| `XTEC` | XTEC email. |
| `CORREU` | Institutional/main email. |
| `NOUS` | New teacher boolean flag. |
| `ACTIU` | Active teacher boolean flag. |
| `BAIXA?` | Leave-of-absence boolean flag. |
| `SUBST?` | Substitute boolean flag. |

### Teacher Identity Rules

- `ESP` is the original teacher code.
- `REDUIT` is the short teacher code used by timetable logic.
- `REDUIT` joins to teacher codes in timetable sheets such as `Horaris` -> `GPU001`.
- `REDUIT` joins to both `leave_absence.teacher_code` and `leave_absence.substitute_code`.
- Full name is built as `NOM COGNOM1 COGNOM2`, omitting blank parts.
- Teacher names should be sorted by `COGNOM1`, then `COGNOM2`, then `NOM`.

### Teacher Boolean Rules

Boolean fields:

- `NOUS`
- `ACTIU`
- `BAIXA?`
- `SUBST?`

Read as true:

- Real boolean `true`
- String `TRUE`

Write boolean fields as real booleans.

### Teacher Status Rules

- `ACTIU` true means the teacher is active.
- `SUBST?` is the only substitute status source.
- Do not infer substitute status from `SITUACIO`.
- Eligible substitute means `SUBST?` true and `ACTIU` true.

### Teacher Full Name Join

Some tables reference teachers by full name instead of code.

For these joins, the teacher full name from `Llista` is built as:

```text
NOM + " " + COGNOM1 + " " + COGNOM2
```

Blank name parts must be omitted so the final value does not contain duplicate or trailing spaces.

## Shared Table: `Dades de professors` -> `leave_absence`

The logical table `Dades de professors` contains a sheet named `leave_absence`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `row_id` | Original row number in `Llista`. |
| `teacher_code` | Original teacher `REDUIT`. |
| `substitute_code` | Substitute teacher `REDUIT`. |
| `start_date` | Leave start date. |
| `end_date` | Leave end date. Blank means still active. |
| `comments` | Free comments. |

### Leave Rules

- A leave is active when the relevant date is between `start_date` and `end_date`, inclusive.
- Blank `end_date` means the leave is active until further notice.
- The relevant date is usually today in the Apps Script timezone `Europe/Madrid`.
- `teacher_code` stores the original teacher `REDUIT`.
- `substitute_code` stores the substitute teacher `REDUIT`.
- Both `teacher_code` and `substitute_code` refer to teachers in `Llista` using `REDUIT`.
- If a substitute cannot be resolved, keep the original teacher and continue.

## Effective Teacher Resolution

Apps that need the effective teacher for a timetable or source row must resolve absences and substitutions consistently.

Resolution process:

1. Read the timetable/source teacher code.
2. Treat the source teacher code as `REDUIT`.
3. Find an active `leave_absence` row where `teacher_code` matches that `REDUIT`.
4. If an active leave is found, replace the teacher with the substitute whose `REDUIT` equals `substitute_code`.
5. If no active leave exists, keep the original teacher.
6. If the substitute code is invalid or cannot be resolved, keep the original teacher.

All teacher code comparisons in this process must use `codeKey_`.

## Registered Relationships

The current app uses four registered sheets:

- `Dades de professors` -> `Llista`
- `Dades de professors` -> `leave_absence`
- `Càrrega lectiva` -> `carrecs`
- `Dinantia` -> `class_groups`

Relationships:

| From | To | Rule |
| --- | --- | --- |
| `leave_absence.teacher_code` | `Llista.REDUIT` | Original teacher on leave. |
| `leave_absence.substitute_code` | `Llista.REDUIT` | Substitute teacher covering the leave. |
| `carrecs.asignado?` | `Llista` full name | Teacher responsible for the group. Full name is `NOM COGNOM1 COGNOM2`, omitting blanks. |
| `class_groups.tutor_carrec` | `carrecs.carrec` | Dinantia group maps to a tutor responsibility/group entry. |

Both teacher fields in `leave_absence` always refer to `Llista.REDUIT`.

## Shared Table: `Càrrega lectiva` -> `carrecs`

The logical table `Càrrega lectiva` contains a sheet named `carrecs`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `carrec` | Responsibility name used to identify the student's group. |
| `hores lectives` | Not needed by this app. |
| `nom en horaris` | Not needed by this app. |
| `asignado?` | Full name of the teacher responsible for the student's group. |

### `carrecs` Rules

- `carrec` identifies the responsibility/group entry.
- `asignado?` stores the full name of the teacher responsible for the student's group.
- `asignado?` relates to `Dades de professors` -> `Llista` by teacher full name.
- The teacher full name is built from `Llista` as `NOM COGNOM1 COGNOM2`, using a single space as the join string and omitting blank parts.
- `hores lectives` is not used by this app.
- `nom en horaris` is not used by this app.

## Shared Table: `Dinantia` -> `class_groups`

The logical table `Dinantia` contains a sheet named `class_groups`.

Row 1 contains headers. Data starts in row 2.

| Header | Meaning |
| --- | --- |
| `id` | Autonumeric field for every row. |
| `dinantia_group_name` | Student group name used with the Dinantia app. |
| `tutor_carrec` | Responsibility/group name that relates this row to `Càrrega lectiva` -> `carrecs`. |

### `class_groups` Rules

- `id` is an autonumeric row identifier.
- `dinantia_group_name` is the group name that will be used with Dinantia.
- `tutor_carrec` relates to `Càrrega lectiva` -> `carrecs`.`carrec`.
- Dinantia is an ERP software for schools. Integration details are outside the current database structure spec and will be specified separately.

## Student Group Tutor Resolution

The app can resolve the teacher responsible for a Dinantia student group through `class_groups`, `carrecs`, and `Llista`.

Resolution process:

1. Start from `Dinantia` -> `class_groups`.
2. Match `class_groups`.`tutor_carrec` to `Càrrega lectiva` -> `carrecs`.`carrec`.
3. Read `carrecs`.`asignado?`.
4. Match `carrecs`.`asignado?` to the teacher full name built from `Dades de professors` -> `Llista` as `NOM COGNOM1 COGNOM2`.
5. Use the matched `Llista` row as the responsible teacher for the student group.

String comparisons for `class_groups`.`tutor_carrec` to `carrecs`.`carrec`, and `carrecs`.`asignado?` to teacher full name, should trim surrounding whitespace.

## Teacher Lookup By Email

One app query must find a teacher from `Dades de professors` -> `Llista` using the `CORREU` column.

Lookup rules:

- Match the requested email against `CORREU`.
- Email matching should trim surrounding whitespace.
- Once the teacher row is found, inspect the `SUBST?` flag.
- If `SUBST?` is not true, use the found teacher row as the teacher.
- If `SUBST?` is true, the found teacher is a substitute and the app must resolve the main teacher they are currently substituting.

### Substitute Email Lookup Resolution

When a teacher found by `CORREU` has `SUBST?` true:

1. Read the substitute teacher's `REDUIT` from `Llista`.
2. Search `Dades de professors` -> `leave_absence` for an active row where `substitute_code` matches that `REDUIT`.
3. Active means `start_date` is on or before the current date and `end_date` is blank or on or after the current date.
4. The current date is evaluated in the Apps Script timezone `Europe/Madrid`.
5. If an active substitution row is found, use `teacher_code` from that row to find the main teacher in `Llista` by `REDUIT`.
6. Use the main teacher's information for the app query.
7. If no active substitution row is found, or if the main teacher cannot be resolved, keep using the substitute teacher row that matched `CORREU`.

All teacher code comparisons in this process must use `codeKey_`.

## Safety Rules

- Do not hardcode spreadsheet IDs in connector logic.
- Do not hardcode registry mappings in connector logic.
- Do not publish local Apps Script configuration files.
- Do not commit `.clasp.json`.
- Do not commit clasp OAuth credentials.
- Do not read, copy, or publish local clasp credential files such as `~/.clasprc.json`.
