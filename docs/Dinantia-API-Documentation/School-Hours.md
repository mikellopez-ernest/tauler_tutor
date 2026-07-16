# School Hours

1 endpoint(s).

## Contents

- [GET /v1.2/school_hours/index](#get-v1-2-school-hours-index) — Get all school hours

## GET /v1.2/school_hours/index

**Get all school hours**

**Version:** `1.2.0`

Gets the list of school hours.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `SchoolHour[]` | Yes | List of school hour objects |
| `pagination` | `Pagination` | Yes | Pagination info |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Pagination

| Field | Type | Required | Description |
|---|---|---|---|
| `page_count` | `Number` | Yes | Total of pages |
| `current_page` | `Number` | Yes | Current page |
| `has_next_page` | `Boolean` | Yes | Whether or not there are more pages after the current one |
| `has_prev_page` | `Boolean` | Yes | Whether or not there are more pages before the current one |
| `count` | `Number` | Yes | Total number of items |
| `limit` | `Number` | Yes | Max items per page |

### Fields: SchoolHour

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the school hour. |
| `name` | `String` | Yes | Name of the school hour. |
| `start` | `String` | Yes | Start hour (`HH:mm:ss`). |
| `end` | `String` | Yes | End hour (`HH:mm:ss`). |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1.2/school_hours/index",
    "success": true,
    "data": [
        {
            "id": "sh_123",
            "name": "School hour 1",
            "start": "08:00:00",
            "end": "09:00:00"
        },
        {
            "id": "sh_456",
            "name": "School hour 2",
            "start": "09:00:00",
            "end": "10:00:00"
        },
        {
            "id": "sh_678",
            "name": "School hour 3",
            "start": "10:00:00",
            "end": "14:00:00"
        },
    ],
    "pagination": {
        "page_count": 1,
        "current_page": 1,
        "has_next_page": false,
        "has_prev_page": false,
        "count": 3,
        "limit": 20
    }
}
```

---
