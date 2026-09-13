# CONV Profile Tab

## Goal

The `CONV` tab in the student profile shows the selected student's convivencia summary for the current incident term.

The tab is read-only.

## Data Sources

The service reads:

| Logical table | Sheet | Purpose |
| --- | --- | --- |
| `Incidències` | `config` | Current term boundaries. |
| `Incidències` | `llistat_anual` | Student incident rows. |

Required `config` headers:

```text
1r trimestre, 2n trimestre, 3r trimestre, Fi curs
```

Required `llistat_anual` headers:

```text
Id, Alumne, Activitat, Assignatura, Puntuació, Data, Professor, Missatge, Nota interna
```

## Term Resolution

The current date is compared against the term boundary dates in `Incidències -> config`.

Rules:

- `1r trimestre`: from `1r trimestre` inclusive to before `2n trimestre`.
- `2n trimestre`: from `2n trimestre` inclusive to before `3r trimestre`.
- `3r trimestre`: from `3r trimestre` inclusive to `Fi curs` inclusive.
- If today falls outside these dates, the tab shows an outside-course message.

The tab only counts incidents from the current term start through today.

## Summary Cards

The tab renders four cards:

| Card | Rule |
| --- | --- |
| `Punts del trimestre` | Sum `Puntuació` for all selected-student incidents in the current term. |
| `Targetes grogues` | Count current-term incidents where `Activitat = FLLEU`. |
| `Targetes vermelles` | Count current-term incidents where `Activitat = FALTA GREU`. |
| `Retards` | Count current-term incidents where `Activitat = RETARD`. |

The selected student is matched by `llistat_anual.Id` against the Dinantia student id from `students_cache.student_id`.

## Detail Modal

The `Targetes grogues`, `Targetes vermelles`, and `Retards` cards are clickable.

Clicking a card opens a modal listing incidents of that kind in the current term.

Columns:

```text
Data
Hora
Assignatura
Activitat
Puntuació
Professor
Missatge
Nota interna
```

Rows are sorted newest first. If two rows have the same timestamp, later sheet rows come first.

## Client Endpoint

The client lazy-loads the summary through:

```javascript
loadStudentConvivenciaSummaryJson(student)
```

Returned data is cached in browser memory per student id for the current session.
