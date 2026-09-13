# ASS Profile Tab

## Goal

The `ASS` tab in the student profile shows a monthly attendance summary for the selected student.

Columns cover the active academic year from September through June. Rows show:

- `Absent no justificat`: student attendance entries with status `absent`.
- `Justificat`: student attendance entries with status `justified`.
- `Retard`: student attendance entries with status `late`.
- `Total hores`: real level teaching hours registered in Dinantia for that month, read from `Dinantia -> attendance_cache`.

## Data Source

Attendance data comes from Dinantia:

- `GET /v1/attendances/index`
- Sorted by most recent according to the Dinantia documentation.
- No server-side student, group, or date filters are documented, so the app paginates from newest backwards and stops once all rows in a page are older than the academic-year start.
- For the current implementation, the academic attendance start is September 8 of the start year, for example `2026-09-08` in school year `2026-2027`.

Group structure comes from the local `Dinantia -> dinantia_groups` cache. Real monthly hour totals come from `Dinantia -> attendance_cache`.

## Level Resolution

The selected student's `groupName` is resolved against `dinantia_groups` by matching group `id`, `name`, or `tag`, and then mapped to its level parent when needed.

For example, `2n ESO A` reads total hours from the `2n ESO` row in `attendance_cache`.

## Real Hours Cache

`attendance_cache` is updated by triggerable methods:

| Method | Behavior |
| --- | --- |
| `updateAttendanceCacheAll()` | Updates every month from the September 8 course start through the current academic month. |
| `updateAttendanceCacheCurrentMonth()` | Updates only the current academic month, from the first day of the month through today. |
| `debugAttendanceCacheAll()` | Dry-run diagnostic version of the full update. Writes detailed logs and does not update the sheet. |
| `debugAttendanceCacheCurrentMonth()` | Dry-run diagnostic version of the current-month update. Writes detailed logs and does not update the sheet. |

`attendance_cache` is level-based. Its first column contains one row per level:

```text
1r ESO
2n ESO
3r ESO
4t ESO
AC 1r
AC 2n
BATX 1r
BATX 2n
PCC 1r
PCC 2n
PFI
SMX 1r
SMX 2n
```

The month columns are `september`, `october`, `november`, `december`, `january`, `february`, `march`, `april`, `may`, and `june`.

For every row label in `attendance_cache`:

1. Resolve the label against `dinantia_groups`.
2. Count only that level scope and all of its descendants.
   - If Dinantia does not expose the level label itself, such as `BATX 1r`, build the scope from active groups whose names/tags/path tails begin with that label, such as `BATX 1r A`, `BATX 1r B`, and `BATX 1r C`.
3. Keep only attendance registers that are not older than the method cutoff date.
4. Keep only attendance registers where at least one attendance group belongs to that level scope.
5. Keep only attendance registers with `attendees.length > 0`.
6. Normalize the register timestamp in the app timezone.
7. Deduplicate hours by `yyyy-MM-dd HH:mm`.
8. Count the unique keys per requested month.
9. Write the results back to the corresponding month columns.

This deliberately uses real registered attendance rows instead of theoretical timetable rows from classes/school hours.

## Student Counts

For the selected student:

1. Find the student inside each matching register's `attendees`.
2. Deduplicate student status counts by the same `yyyy-MM-dd HH:mm` hour key.
3. Count status `absent`, `justified`, and `late` into their corresponding month.

## Caching

The persistent real-hours cache lives in `Dinantia -> attendance_cache`. The profile endpoint resolves the selected student's class group to its level and reads that level row for `Total hores`.

The server may still use short-lived Apps Script cache for the selected student's status counts.
