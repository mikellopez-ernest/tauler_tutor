# CRM Classes

1 endpoint(s).

## Contents

- [GET /v1/crm_classes/index](#get-v1-crm-classes-index) — Get all classes

## GET /v1/crm_classes/index

**Get all classes**

**Version:** `1.0.0`

Gets the list of (currently active) CRM Classes.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `only_active_periods` | `Boolean` | No | Include only classes from active periods. Defaults to `true`. |
| `period` | `String` | No | Filter by period name (exact match) |
| `course` | `String` | No | Filter by course name (exact match) |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of crm\_class objects |
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

### Fields: CrmClass

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `period` | `CrmPeriod` | Yes |  |
| `course` | `CrmCourse` | Yes |  |
| `total` | `int` | Yes | Number of spots (regardless of them being available for new candidates or not) for this class as configured by the school. |
| `available` | `int` | Yes | Number of spots (that are available for candidates). This number does not decrease as candidates enroll (change to `confirmed` status). |
| `used` | `int` | Yes | Current number of used spots. This number increases as candidates enroll (change to `confirmed` status). |
| `margin_available` | `int` | Yes | Same as `available`, but for `waiting` status. |
| `margin_used` | `int` | Yes | Same as `used`, but for `waiting` status. |
| `created` | `String` | Yes | Creation date |

### Fields: CrmPeriod

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `String` | Yes | Period name |
| `metadata` | `Object` | Yes | Any custom key-value pairs you may have defined |
| `active` | `Boolean` | Yes | Whether or not the period is currently active |

### Fields: CrmCourse

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `String` | Yes | Course name |
| `metadata` | `Object` | Yes | Any custom key-value pairs you may have defined |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/crm_classes/index?only_active_periods=false",
    "success": true,
    "data": [
        {
            "id": "cla_rkh9cjYr3UGa5KWW",
            "name": "Otoño - Primaria 1",
            "period": {
                "name": "Otoño",
                "metadata": {
                    "yourKey": "yourValue"
                },
                "active": true
            },
            "course": {
                "name": "Primaria 1",
                "metadata": {}
            },
            "total": 40,
            "available": 40,
            "used": 5,
            "margin_available": 20,
            "margin_used": 0,
            "created": "2019-09-05T06:45:32+0000"
        },
        {
            "id": "cla_2sZ60BQjIaAtcORE",
            "name": "Otoño - Secundaria 2",
            "period": {
                "name": "Otoño",
                "metadata": {
                    "yourKey": "yourValue"
                },
                "active": false
            },
            "course": {
                "name": "Secundaria 2",
                "metadata": {}
            },
            "total": 20,
            "available": 20,
            "used": 20,
            "margin_available": 10,
            "margin_used": 3,
            "created": "2019-09-05T06:45:42+0000"
        },
    ],
    "pagination": {
        "page_count": 1,
        "current_page": 1,
        "has_next_page": false,
        "has_prev_page": false,
        "count": 2,
        "limit": 20
    }
}
```

---
