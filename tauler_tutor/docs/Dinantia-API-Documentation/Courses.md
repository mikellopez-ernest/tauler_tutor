# Courses

4 endpoint(s).

## Contents

- [DELETE /v1/courses/delete/:id](#delete-v1-courses-delete-id) — Delete a course
- [GET /v1/courses/index](#get-v1-courses-index) — Get all courses
- [POST /v1/courses/update/:id](#post-v1-courses-update-id) — Create/update course
- [GET /v1/courses/view/:id](#get-v1-courses-view-id) — Get course

## DELETE /v1/courses/delete/:id

**Delete a course**

**Version:** `1.0.0`

Deletes a course.

If you define a `replacement_id`, the replacement course will be assigned to all attendances related to the deleted course.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `replacement_id` | `String` | Yes | Course id to replace references to existing attendances of the deleted course. |

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
    "url": "/api/web/v1/courses/delete/cou_EheoNXTI0XKDtJ1h?replacement_id=cou_QSOvifl39Bpety2J",
    "success": true
 }
```

### Error response

### Example: Course not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/courses/delete/does-not-exist",
    "code": 404
   }
```

### Example: Replacement not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/courses/delete/cou_EheoNXTI0XKDtJ1h?replacement_id=does-not-exist",
    "code": 404
   }
```

---

## GET /v1/courses/index

**Get all courses**

**Version:** `1.0.0`

Gets the list of courses / subjects.

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
| `data` | `Course[]` | Yes | List of course objects |
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

### Fields: Course

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id |
| `name` | `String` | Yes | Name |
| `created` | `String` | Yes | Creation date |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/courses/index",
    "success": true,
    "data": [
        {
            "id": "cou_QSOvifl39Bpety2J",
            "name": "Maths",
            "created": "2020-03-25T15:40:02+0000"
        },
        {
            "id": "cou_EheoNXTI0XKDtJ1h",
            "name": "English",
            "created": "2020-02-20T08:19:21+0000"
        }
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

## POST /v1/courses/update/:id

**Create/update course**

**Version:** `1.0.0`

Updates a specified course, or creates one if no id specified.

### Request

### Parameters: Group

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `String` | Yes | Name |

### Request example: Example creation

```json
{
    "name": "New"
}
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Course` | Yes | Course |
| `errors` | `Object[]` | Yes | List of errors if request is not properly formatted. |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Course

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id |
| `name` | `String` | Yes | Name |
| `created` | `String` | Yes | Creation date |

### Example: Successful creation

```json
{
    "code": 200,
    "url": "/api/web/v1/courses/update",
    "success": true,
    "data": {
        "id": "cou_u1R3xkUqe9Q9iid7",
        "name": "New",
        "created": "2020-04-03T11:33:31+0000"
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Error message |

### Example: Course not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/courses/update/does-not-exist",
    "code": 404
   }
```

### Example: Duplicate name

```json
{
       "message": "Duplicate name",
       "url": "/api/web/v1/courses/update",
       "code": 404
   }
```

---

## GET /v1/courses/view/:id

**Get course**

**Version:** `1.0.0`

Get a course

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Course` | Yes | Course object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Course

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id |
| `name` | `String` | Yes | Name |
| `created` | `String` | Yes | Creation date |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/courses/view/cou_EheoNXTI0XKDtJ1h",
    "success": true,
    "data": {
        "id": "cou_EheoNXTI0XKDtJ1h",
        "name": "English",
        "created": "2020-02-20T08:19:21+0000"
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Course not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/courses/view/does-not-exist",
    "code": 404
   }
```

---
