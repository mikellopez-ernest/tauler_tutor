# Webhooks

4 endpoint(s).

## Contents

- [DELETE /v1/webhooks/delete/:id](#delete-v1-webhooks-delete-id) — Delete a webhook
- [GET /v1/webhooks/index](#get-v1-webhooks-index) — Get all webhooks
- [POST /v1/webhooks/update/:id](#post-v1-webhooks-update-id) — Create/update webhook
- [GET /v1/webhooks/view/:id](#get-v1-webhooks-view-id) — Get webhook

## DELETE /v1/webhooks/delete/:id

**Delete a webhook**

**Version:** `1.0.0`

Deletes a webhook.

All events and its corresponding notification logs will be deleted too.

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
    "url": "/api/web/v1/webhooks/delete/wh_ZheoNXTI0XKDtJ1h",
    "success": true
 }
```

---

## GET /v1/webhooks/index

**Get all webhooks**

**Version:** `1.0.0`

Gets the list of webhooks, sorted by most recent.

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
| `data` | `Webhook[]` | Yes | List of webhook objects |
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

### Fields: Webhook

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the webhook |
| `endpoint` | `String` | Yes | Webhook endpoint |
| `types` | `String` | Yes | Event type |
| `active` | `Boolean` | Yes | Webhook status |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/webhooks/index",
    "success": true,
    "data": [
        {
            "id": "wh_XVwHdRUifTlX9ALi",
            "endpoint": "https://your-endpoint.com/some/path",
            "active": true,
            "event_type": "automation.candidate"
        },
        {
            "id": "wh_BhvyqEuPCmnKnU2C",
            "endpoint": "https://your-endpoint.com/some/other/path",
            "active": true,
            "event_type": "automation.candidate"
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

## POST /v1/webhooks/update/:id

**Create/update webhook**

**Version:** `1.0.0`

Updates a specified webhook, or creates one if no id specified.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `endpoint` | `String` | Yes | Your https endpoint for the webhook to notify |
| `event_type` | `String` | Yes | You can find more information about these events in the `Developers > Webhooks` section of the web app. |
| `active` | `Bool` | No | Used to enable or disable your webhooks. Defaults to `true` for new webhooks if not specified. |

### Request example: Create a webhook

```json
{
    "endpoint": "https://your-endpoint.com/some/path",
    "event_type": "automation.candidate"
}
```

### Request example: Enable a webhook

```json
{
    "active": true
}
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Webhook` | Yes | Webhook |
| `errors` | `Object[]` | Yes | List of errors (if the request is not properly formatted). |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Webhook

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the webhook |
| `endpoint` | `String` | Yes | Webhook endpoint |
| `types` | `String` | Yes | Event type |
| `active` | `Boolean` | Yes | Webhook status |
| `signing_secret` | `String` | Yes | Signing secret for the webhook. **Only displayed on creation response**. |

### Example: Successful creation

```json
{
    "code": 200,
    "url": "/api/web/v1/webhooks/update",
    "success": true,
    "data": {
        "id": "wh_BhvyqEuPCmnKnU2C",
        "endpoint": "https://your-endpoint.com/some/other/path",
        "active": true,
        "event_type": "automation.candidate",
        "signing_secret": "8FyulsL2bw77oaaI0TJnt1bX68SJi52pLrsRJnfQHKCuyo1Hjvwd1bLW2IpCku2D"
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Error message |

### Example: Webhook not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/webhooks/update/does-not-exist",
    "code": 404
}
```

---

## GET /v1/webhooks/view/:id

**Get webhook**

**Version:** `1.0.0`

Get a webhook

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Webhook` | Yes | Webhook object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Webhook

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the webhook |
| `endpoint` | `String` | Yes | Webhook endpoint |
| `types` | `String` | Yes | Event type |
| `active` | `Boolean` | Yes | Webhook status |

### Example: Successful get:

```json
{
    "code": 200,
    "url": "/api/web/v1/webhooks/view/wh_XVwHdRUifTlX9ALi",
    "success": true,
    "data": {
        "id": "wh_XVwHdRUifTlX9ALi",
        "endpoint": "https://your-endpoint.com/some/path",
        "active": true,
        "event_type": "automation.candidate"
    }
  }
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Webhook not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/webhooks/view/does-not-exist",
    "code": 404
   }
```

---
