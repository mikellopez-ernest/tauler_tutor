# Classes

4 endpoint(s).

## Contents

- [DELETE /v1.2/classes/delete/:id](#delete-v1-2-classes-delete-id) — Delete a class
- [GET /v1.2/classes/index](#get-v1-2-classes-index) — Get all classes
- [POST /v1.2/classes/update/:id](#post-v1-2-classes-update-id) — Create/update class
- [GET /v1.2/classes/view/:id](#get-v1-2-classes-view-id) — Get a class

## DELETE /v1.2/classes/delete/:id

**Delete a class**

**Version:** `1.2.0`

Deletes a class.

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Example: Example response

```json
{
    "code": 200,
    "url": "/api/web/v1.2/classes/delete/clh_gIpLTgfpyxHDZMXr",
    "success": true
 }
```

### Error response

### Example: Class not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1.2/classes/delete/does-not-exist",
    "code": 404
   }
```

---

## GET /v1.2/classes/index

**Get all classes**

**Version:** `1.2.0`

Gets the list of classes.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | No | filter by account |
| `group_id` | `String` | No | filter by group |
| `course_id` | `String` | No | filter by course |
| `expand` | `String[]` | No | Defaults to `course` + `school_hour` |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Classes[]` | Yes | List of class objects |
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

### Fields: Class

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the class. |
| `weekday` | `int` | Yes | Day of the week of the class (1 - Monday ... 7 - Sunday) |
| `school_hour_id` | `String` | Yes | Id of the school\_hour for the class |
| `account_id` | `String` | Yes | Id of the teacher that registered the class |
| `available_for_substitutions` | `Boolean` | Yes | Whether or not this is a substitution slot |
| `course_id` | `String\|null` | Yes | Id of the course for the class |
| `classroom` | `String\|null` | Yes | Name of the classroom |
| `groups` | `String[]` | Yes | List of group Ids for the class |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1.2/classes/index",
    "success": true,
    "data": [
        {
            "id": "clh_RD9xGxkX3dEJZh0F",
            "account_id": "DIN-A-000001",
            "school_hour_id": "sch_7viu551wLSl080Eh",
            "course_id": "cou_cekoraeMpzC5uEth",
            "weekday": 1,
            "comment": null,
            "classroom": "A-101",
            "available_for_substitutions": false,
            "groups": [
                "ALU"
            ],
            "course": {
                "id": "cou_cekoraeMpzC5uEth",
                "name": "History",
                "created": "2024-07-29T09:50:49+0000"
            },
            "school_hour": {
                "id": "sch_7viu551wLSl080Eh",
                "name": "",
                "start": "07:00:00",
                "end": "08:00:00"
            }
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

## POST /v1.2/classes/update/:id

**Create/update class**

**Version:** `1.2.0`

Updates a specified class, or creates one if no id specified.

### Request

### Parameters: Class

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | Id of the teacher |
| `school_hour_id` | `String` | Yes | Id of the school\_hour |
| `weekday` | `int` | Yes | Day of the week of the class (1 - Monday ... 7 - Sunday) |
| `available_for_substitutions` | `Boolean` | No | Whether this is a regular class (`false`) or a free time slot that the user has to cover for other teachers' leaves (`true`). Defaults to `false`. |
| `course_id` | `String` | No | Id of the course (required if and only if not a substitution slot) |
| `groups` | `String[]` | No | List of group Ids for the class (required if and only if not a substitution slot) |
| `comment` | `String` | No | Comment of the class |

### Request example: Example creation

```json
{
    "account_id": "DIN-A-000001",
    "school_hour_id": "sch_7viu551wLSl080Eh",
    "course_id": "cou_cekoraeMpzC5uEth",
    "weekday": 2,
    "groups": [
        "ALU"
    ]
}
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Class` | Yes | Class |
| `errors` | `Object[]` | Yes | List of errors if request is not properly formatted. |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Class

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the class. |
| `weekday` | `int` | Yes | Day of the week of the class (1 - Monday ... 7 - Sunday) |
| `school_hour_id` | `String` | Yes | Id of the school\_hour for the class |
| `account_id` | `String` | Yes | Id of the teacher that registered the class |
| `available_for_substitutions` | `Boolean` | Yes | Whether or not this is a substitution slot |
| `course_id` | `String\|null` | Yes | Id of the course for the class |
| `classroom` | `String\|null` | Yes | Name of the classroom |
| `groups` | `String[]` | Yes | List of group Ids for the class |

### Example: Successful creation

```json
{
    "code": 200,
    "url": "/api/web/v1.2/classes/update",
    "success": true,
    "data": {
        "id": "clh_123",
        "account_id": "TEACHER-1",
        "school_hour_id": "sh_123",
        "course_id": "cou_123",
        "weekday": 1,
        "comment": "Comment 1",
        "available_for_substitutions": false,
        "classroom": null,
        "groups": [
            "MAIN-A"
        ]
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Error message |

### Example: Class not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1.2/classes/update/does-not-exist",
    "code": 404
   }
```

---

## GET /v1.2/classes/view/:id

**Get a class**

**Version:** `1.2.0`

Gets a single class.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `expand` | `String[]` | No | Defaults to `course` + `school_hour` |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Classes[]` | Yes | List of class objects |
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

### Fields: Class

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the class. |
| `weekday` | `int` | Yes | Day of the week of the class (1 - Monday ... 7 - Sunday) |
| `school_hour_id` | `String` | Yes | Id of the school\_hour for the class |
| `account_id` | `String` | Yes | Id of the teacher that registered the class |
| `available_for_substitutions` | `Boolean` | Yes | Whether or not this is a substitution slot |
| `course_id` | `String\|null` | Yes | Id of the course for the class |
| `classroom` | `String\|null` | Yes | Name of the classroom |
| `groups` | `String[]` | Yes | List of group Ids for the class |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1.2/classes/view/clh_123",
    "success": true,
    "data": {
        "id": "clh_RD9xGxkX3dEJZh0F",
        "account_id": "DIN-A-000001",
        "school_hour_id": "sch_7viu551wLSl080Eh",
        "available_for_substitutions": true,
        "course_id": null,
        "weekday": 1,
        "comment": null,
        "classroom": null,
        "groups": [],
        "course": null,
        "school_hour": {
            "id": "sch_7viu551wLSl080Eh",
            "name": "",
            "start": "07:00:00",
            "end": "08:00:00"
        }
    }
}
```

---
