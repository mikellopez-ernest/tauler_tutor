# TUT Profile Tab

The `TUT` tab in the student profile shows family-tutoring meeting records for the selected student.

## Data Source

Rows are stored in `Dinantia` -> `tutories`.

Required columns:

| Column | Meaning |
| --- | --- |
| `id` | Local numeric record ID. |
| `student_id` | Dinantia student/account ID. |
| `data` | Meeting date. |
| `assistents` | Free text attendees. |
| `motiu de la reunió` | Free text meeting reason. |
| `desenvolupament` | Free text development/notes. |
| `acords` | Free text agreements. |

## Profile Table

The tab lists only records whose `student_id` matches the active student.

Visible columns:

| Column | Source |
| --- | --- |
| `Data` | `data`, formatted as `dd/MM/yyyy`. |
| `Motiu` | `motiu de la reunió`. |

Rows are sorted by newest date first, then by numeric `id` descending.

## Modal

The `Nova reunió` button opens a modal for a new record.

Clicking an existing row opens the same modal populated with that record.

Fields:

| Field | Control |
| --- | --- |
| `Data` | Text input showing `dd/mm/yyyy`, backed by a Catalan calendar with Monday as the first day, required. |
| `Assistents` | Textarea, 2 rows. |
| `Motiu de la reunió` | Textarea, 2 rows. |
| `Desenvolupament` | Textarea, 6 rows. |
| `Acords` | Textarea, 6 rows. |

Saving writes through `saveStudentTutoriaJson(record)`.

New records receive the next numeric `id`. Existing records are updated only when both `id` and `student_id` match.
