# CRM Funnels

1 endpoint(s).

## Contents

- [GET /v1.1/crm_funnels/index](#get-v1-1-crm-funnels-index) — Get all funnels

## GET /v1.1/crm_funnels/index

**Get all funnels**

**Version:** `1.1.0`

Get all funnels

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
| `data` | `CrmFunnel[]` | Yes | List of funnels |
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

### Fields: CrmFunnel

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id |
| `name` | `String` | Yes | Name |
| `crm_stages` | `CrmStage[]` | Yes | Crm stages |

### Fields: CrmStage

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Stage id |
| `name` | `String` | Yes | Stage name |
| `position` | `Number` | Yes | Position within the funnel |

### Example: Basic request

```json
{
    "code": 200,
    "url": "/api/web/v1/crm_funnels/index",
    "success": true,
    "data": [
        {
			"id": "fun_zSrFqPW0DDYAyoLq",
			"name": "Main",
			"crm_stages": [
				{
					"id": "sta_XdFuEvHhnTCa8dqf",
					"name": "Information requested",
					"position": 0
				},
				{
					"id": "sta_miI4uBnHcUcmJqf8",
					"name": "Interview done",
					"position": 1
				},
				{
					"id": "sta_tjOAwxPQad2nYTsb",
					"name": "Application form completed",
					"position": 2
				}
			]
		}
    ],
    "pagination": {
        "page_count": 1,
        "current_page": 1,
        "has_next_page": false,
        "has_prev_page": false,
        "count": 1,
        "limit": 20
    }
}
```

---
