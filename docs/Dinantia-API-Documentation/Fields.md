# Fields

2 endpoint(s).

## Contents

- [GET /v1.2/fields/index](#get-v1-2-fields-index) — Get all fields
- [GET /v1/fields/index](#get-v1-fields-index) — Get all fields

## GET /v1.2/fields/index

**Get all fields**

**Version:** `1.2.0`

Gets the list of api-ready custom fields.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `roles` | `String[]` | No | Filter by role, among: `Student`, `Candidate`, `CandidateParent`, `Staff` |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of field objects |
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

### Fields: Field

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the field, as specified through the web app |
| `roles` | `String[]` | Yes | Roles of the field; e.g. `['Candidate', 'Student']` |
| `scope` | `String\|null` | Yes | Scope of the field. E.g. 'crm.default' |
| `name` | `String` | Yes | Name of the field |
| `data_type` | `String` | Yes | Data type for the field |
| `multiple` | `Boolean` | Yes | Whehter or not the field allows multiple values |
| `has_options` | `Boolean` | Yes | Whether or not the field defines options as possible values |
| `options` | `String[]` | Yes | List of options/possible values |
| `allow_custom` | `Boolean` | Yes | Whether or not the field admits values not among the available options. When true, adding new values result in a new option being created and added to the field. |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1.2/fields/index",
    "success": true,
    "data": [
        {
            "id": "name",
            "name": "Name",
            "roles": ["Candidate", "Student"],
            "scope": "crm.default",
            "data_type": "text",
            "multiple": false,
            "has_options": false,
            "options": [],
            "allow_custom": false
        },
        {
            "id": "candidate-email",
            "name": "Email",
            "roles": ["Candidate"],
            "scope": "crm.default",
            "data_type": "email",
            "multiple": false,
            "has_options": false,
            "options": [],
            "allow_custom": false
        },
        {
            "id": "origin-school",
            "name": "Origin school",
            "roles": ["Candidate"],
            "scope": "crm.academic",
            "data_type": "text",
            "multiple": false,
            "has_options": true,
            "options": [
                "Shakespeare school",
                "Sunshine school"
            ],
            "allow_custom": false
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

## GET /v1/fields/index

**Get all fields**

**Version:** `1.0.0`

Gets the list of api-ready custom fields.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `roles` | `String[]` | No | Filter by role, among: `Student`, `Candidate`, `CandidateParent`, `Staff` |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of field objects |
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

### Fields: Field

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the field, as specified through the web app |
| `role` | `String` | Yes | Role of the field; e.g. 'Candidate' |
| `scope` | `String\|null` | Yes | Scope of the field. E.g. 'crm.default' |
| `name` | `String` | Yes | Name of the field |
| `data_type` | `String` | Yes | Data type for the field |
| `multiple` | `Boolean` | Yes | Whehter or not the field allows multiple values |
| `has_options` | `Boolean` | Yes | Whether or not the field defines options as possible values |
| `options` | `String[]` | Yes | List of options/possible values |
| `allow_custom` | `Boolean` | Yes | Whether or not the field admits values not among the available options. When true, adding new values result in a new option being created and added to the field. |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/fields/index",
    "success": true,
    "data": [
        {
            "id": "name",
            "name": "Name",
            "role": "Candidate",
            "scope": "crm.default",
            "data_type": "text",
            "multiple": false,
            "has_options": false,
            "options": [],
            "allow_custom": false
        },
        {
            "id": "candidate-email",
            "name": "Email",
            "role": "Candidate",
            "scope": "crm.default",
            "data_type": "email",
            "multiple": false,
            "has_options": false,
            "options": [],
            "allow_custom": false
        },
        {
            "id": "origin-school",
            "name": "Origin school",
            "role": "Candidate",
            "scope": "crm.academic",
            "data_type": "text",
            "multiple": false,
            "has_options": true,
            "options": [
                "Shakespeare school",
                "Sunshine school"
            ],
            "allow_custom": false
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
