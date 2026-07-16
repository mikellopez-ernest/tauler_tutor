# Groups

4 endpoint(s).

## Contents

- [DELETE /v1/groups/delete/:id](#delete-v1-groups-delete-id) — Delete a group
- [GET /v1/groups/index](#get-v1-groups-index) — Get all groups
- [POST /v1/groups/update/:id](#post-v1-groups-update-id) — Create/update group
- [GET /v1/groups/view/:id](#get-v1-groups-view-id) — Get group

## DELETE /v1/groups/delete/:id

**Delete a group**

**Version:** `1.0.0`

Disables/deletes a group.

Root group cannot be deleted.

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/groups/delete/MAIN",
    "success": true
 }
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Not response

```json
{
    "message": "Not found",
    "url": "/api/web/v1/groups/view/does-not-exist",
    "code": 404
   }
```

---

## GET /v1/groups/index

**Get all groups**

**Version:** `1.0.0`

Gets the list of groups

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `parent` | `String` | Yes | (optional) Parent id. When specified, only the children of that group will be fetched. |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of group objects |
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

### Fields: Group

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `tag` | `String` | Yes | Tag of the group, built using the chain of group names from the root up until the group. |
| `parent` | `String` | Yes | Id of the parent group. |
| `types` | `String[]` | Yes | Type of group for messaging. Either students, parents, or both. |
| `created` | `String` | Yes | Creation date |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/groups/index",
    "success": true,
    "data": [
        {
            "id": "ROOT",
            "name": "All groups",
            "tag": "All groups",
            "parent": null,
            "types": [
                "parents"
            ],
            "created": "2018-01-01T11:22:33+00:00"
        },
        {
            "id": "MAIN",
            "name": "Main Group",
            "tag": "Main Group",
            "parent": "ROOT",
            "types": [
                "parents", "students"
            ],
            "created": "2018-01-01T11:22:33+00:00"
        },
        {
            "id": "MAIN-A",
            "name": "A",
            "tag": "Main Group:A",
            "parent": "MAIN",
            "types": [
                "parents", "students"
            ],
            "created": "2018-01-01T11:22:33+00:00"
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

## POST /v1/groups/update/:id

**Create/update group**

**Version:** `1.0.0`

Updates a specified group, or creates one if no id specified.

All groups must have a parent, except the default root group.

### Request

### Parameters: Group

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `parent` | `String` | Yes | Id of the parent group. Required on creation, not allowed to edit. |
| `types` | `String[]` | Yes | Type of group for messaging. Either students, parents, or both. |

### Request example: Example request (successful edit)

```json
{
    "name": "Main!!",
    "types": ["students"]
}
```

### Request example: Example request (invalid creation)

```json
{
    "name": "UpdatedName"
}
```

### Request example: Bad request example

```json
{
    "id": "newgroup",
    "name": "I am a new group with an invalid parent",
    "parent": "I-DONT-EXIST",
}
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Group. Null if update not successful |
| `errors` | `Object[]` | Yes | List of errors if request is not properly formatted. |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Group

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `tag` | `String` | Yes | Tag of the group, built using the chain of group names from the root up until the group. |
| `parent` | `String` | Yes | Id of the parent group. |
| `types` | `String[]` | Yes | Type of group for messaging. Either students, parents, or both. |
| `created` | `String` | Yes | Creation date |

### Example: Example response (successful edit)

```json
{
    "code": 200,
    "url": "/api/web/v1/groups/view/MAIN",
    "success": true,
    "data": {
        "id": "MAIN",
        "name": "Main!!",
        "tag": "Main!!",
        "parent": "ROOT",
        "types": [
            "students"
        ],
           "created": "2018-01-01T11:22:33+00:00"
    }
}
```

### Example: Example response (invalid creation)

```json
{
        "code": 200,
        "url": "/api/web/v1/groups/update",
        "errors": [
            {
                "field": "id",
                "code": "_required",
                "message": "This field is required",
                "value": null
            },
            {
                "field": "parent",
                "code": "_required",
                "message": "This field is required",
                "value": null
            }
        ],
        "success": false,
        "data": null
 }
```

### Example: Bad request response example

```json
{
    "message": "Unknown parent I-DONT-EXIST",
    "url": "/api/web/v1/groups/update",
    "code": 400,
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Not response

```json
{
    "message": "Not found",
    "url": "/api/web/v1/groups/view/does-not-exist",
    "code": 404
   }
```

---

## GET /v1/groups/view/:id

**Get group**

**Version:** `1.0.0`

Gets a specific group

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Account object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Group

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `tag` | `String` | Yes | Tag of the group, built using the chain of group names from the root up until the group. |
| `parent` | `String` | Yes | Id of the parent group. |
| `types` | `String[]` | Yes | Type of group for messaging. Either students, parents, or both. |
| `created` | `String` | Yes | Creation date |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/groups/view/MAIN",
    "success": true,
    "data": {
        "id": "MAIN",
        "name": "Main Group",
        "tag": "Main Group",
        "parent": "ROOT",
        "types": [
            "parents", "students"
        ],
        "created": "2018-01-01T11:22:33+00:00"
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Not response

```json
{
    "message": "Not found",
    "url": "/api/web/v1/groups/view/does-not-exist",
    "code": 404
   }
```

---
