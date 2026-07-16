# CRM Candidacies

7 endpoint(s).

## Contents

- [DELETE /v1.2/crm_candidacies/delete/:id](#delete-v1-2-crm-candidacies-delete-id) — Delete a candidacy
- [GET /v1.2/crm_candidacies/index](#get-v1-2-crm-candidacies-index) — Get all candidacies
- [GET /v1.1/crm_candidacies/index](#get-v1-1-crm-candidacies-index) — Get all candidacies
- [GET /v1/crm_candidacies/index](#get-v1-crm-candidacies-index) — Get all candidacies
- [POST /v1/crm_candidacies/update](#post-v1-crm-candidacies-update) — Create a candidacy
- [POST /v1/crm_candidacies/update](#post-v1-crm-candidacies-update) — Create a candidacy
- [POST /v1/crm_candidacies/update](#post-v1-crm-candidacies-update) — Create a candidacy

## DELETE /v1.2/crm_candidacies/delete/:id

**Delete a candidacy**

**Version:** `1.2.0`

Deletes a candidacy.

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
    "url": "/api/web/v1.2/crm_candidacies/delete/can_T4406vTeDMNJrBq9",
    "success": true
 }
```

### Error response

### Example: Candidacy not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1.2/crm_candidacies/delete/does-not-exist",
    "code": 404
   }
```

---

## GET /v1.2/crm_candidacies/index

**Get all candidacies**

**Version:** `1.2.0`

Gets the list of (currently active) candidacies. A candidacy ties a crm candidate with a period/course. One candidate may have several candidacies or none at all.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | No | filter by account |
| `crm_class_id` | `String` | No | filter by crm\_class |
| `expand` | `String[]` | No |  |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of candidacies objects |
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

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |
| `crm_stage_id` | `String\|null` | Yes | id of the current stage |
| `interest_level` | `String\|Null` | Yes | Interest level. Null when it hasn't been set. |
| `status` | `String` | Yes | Status |
| `status_data` | `StatusData` | No | Status data. Only if status is not `ongoing` |
| `crm_stage` | `CrmStage` | No | Current stage |
| `crm_stage_logs` | `CrmStageLog[]` | No | History of stages |
| `id` | `String` | Yes | Id of the candidacy |

### Fields: StatusData

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `String` | Yes | Date when the status was assigned |
| `reason` | `String\|Null` | No | Reason for the status. Only if status is one of `lost`, `rejected`. |
| `comment` | `String` | No | Comment added when setting the status. Only if status is one of `lost`, `rejected`. |
| `school` | `String\|Null` | No | Destination school. Only if status is `lost`. |

### Fields: CrmStageLog

| Field | Type | Required | Description |
|---|---|---|---|
| `crm_stage_id` | `String` | Yes | Stage id |
| `date` | `String` | Yes | Date when the stage was assigned |
| `crm_stage` | `CrmStage` | No | Crm stage |

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
    "url": "/api/web/v1/crm_candidacies/index",
    "success": true,
    "data": [
        {
            "id": "can_Fu2Lo8XS9HYIJmNG",
            "account_id": "DIN-A-000001",
            "crm_class_id": "cla_we2k4vIW6CtmX48X",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
            "interest_level": "high",
            "status": "ongoing"
        },
        {
            "id": "can_vXarfl6qB1EQugSk",
            "account_id": "DIN-A-000002",
            "crm_class_id": "cla_cjAIQLKhcZi4h9Tm",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_miI4uBnHcUcmJqf8",
            "interest_level": null,
            "status": "lost",
            "status_data": {
                "date": "2022-11-28T11:14:19+0000",
                "reason": "Far away",
                "comment": "He lives 2h away from the school"
            }
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

### Example: Specific candidate with stage history

```json
{
    "code": 200,
    "url": "/api/web/v1/crm_candidacies/index?account_id=DIN-A-000001&expand[]=crm_stage_logs.crm_stage",
    "success": true,
    "data": [
        {
            "id": "can_Fu2Lo8XS9HYIJmNG",
            "account_id": "DIN-A-000001",
            "crm_class_id": "cla_we2k4vIW6CtmX48X",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
            "interest_level": "high",
            "status": "ongoing",
            "crm_stage_logs": [
                {
                    "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
                    "date": "2022-11-28T11:32:46+0000",
                    "crm_stage": {
                        "id": "sta_XdFuEvHhnTCa8dqf",
                        "name": "Information requested",
                        "position": 0
                    }
                }
            ]
        },
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

## GET /v1.1/crm_candidacies/index

**Get all candidacies**

**Version:** `1.1.0`

Gets the list of (currently active) candidacies. A candidacy ties a crm candidate with a period/course. One candidate may have several candidacies or none at all.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | No | filter by account |
| `crm_class_id` | `String` | No | filter by crm\_class |
| `expand` | `String[]` | No |  |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of candidacies objects |
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

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |
| `crm_stage_id` | `String\|null` | Yes | id of the current stage |
| `interest_level` | `String\|Null` | Yes | Interest level. Null when it hasn't been set. |
| `status` | `String` | Yes | Status |
| `status_data` | `StatusData` | No | Status data. Only if status is not `ongoing` |
| `crm_stage` | `CrmStage` | No | Current stage |
| `crm_stage_logs` | `CrmStageLog[]` | No | History of stages |

### Fields: StatusData

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `String` | Yes | Date when the status was assigned |
| `reason` | `String\|Null` | No | Reason for the status. Only if status is one of `lost`, `rejected`. |
| `comment` | `String` | No | Comment added when setting the status. Only if status is one of `lost`, `rejected`. |
| `school` | `String\|Null` | No | Destination school. Only if status is `lost`. |

### Fields: CrmStageLog

| Field | Type | Required | Description |
|---|---|---|---|
| `crm_stage_id` | `String` | Yes | Stage id |
| `date` | `String` | Yes | Date when the stage was assigned |
| `crm_stage` | `CrmStage` | No | Crm stage |

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
    "url": "/api/web/v1/crm_candidacies/index",
    "success": true,
    "data": [
        {
            "account_id": "DIN-A-000001",
            "crm_class_id": "cla_we2k4vIW6CtmX48X",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
            "interest_level": "high",
            "status": "ongoing"
        },
        {
            "account_id": "DIN-A-000002",
            "crm_class_id": "cla_cjAIQLKhcZi4h9Tm",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_miI4uBnHcUcmJqf8",
            "interest_level": null,
            "status": "lost",
            "status_data": {
                "date": "2022-11-28T11:14:19+0000",
                "reason": "Far away",
                "comment": "He lives 2h away from the school"
            }
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

### Example: Specific candidate with stage history

```json
{
    "code": 200,
    "url": "/api/web/v1/crm_candidacies/index?account_id=DIN-A-000001&expand[]=crm_stage_logs.crm_stage",
    "success": true,
    "data": [
        {
            "account_id": "DIN-A-000001",
            "crm_class_id": "cla_we2k4vIW6CtmX48X",
            "created": "2019-11-11T14:34:56+0000",
            "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
            "interest_level": "high",
            "status": "ongoing",
            "crm_stage_logs": [
                {
                    "crm_stage_id": "sta_XdFuEvHhnTCa8dqf",
                    "date": "2022-11-28T11:32:46+0000",
                    "crm_stage": {
                        "id": "sta_XdFuEvHhnTCa8dqf",
                        "name": "Information requested",
                        "position": 0
                    }
                }
            ]
        },
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

## GET /v1/crm_candidacies/index

**Get all candidacies**

**Version:** `1.0.0`

Gets the list of (currently active) candidacies. A candidacy ties a crm candidate with a period/course. One candidate may have several candidacies or none at all.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | (optional) filter by account |
| `crm_class_id` | `String` | Yes | (optional) filter by crm\_class |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of candidacies objects |
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

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/crm_candidacies/index",
    "success": true,
    "data": [
        {
            "account_id": "DIN-A-000001",
            "crm_class_id": "cla_we2k4vIW6CtmX48X",
            "created": "2019-11-11T14:34:56+0000"
        },
        {
            "account_id": "DIN-A-000002",
            "crm_class_id": "cla_cjAIQLKhcZi4h9Tm",
            "created": "2019-11-11T14:34:56+0000"
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

## POST /v1/crm_candidacies/update

**Create a candidacy**

**Version:** `1.2.0`

Adds the specified candidate to the specified class.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Created candidacy |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |
| `crm_stage_id` | `String\|null` | Yes | id of the current stage |
| `interest_level` | `String\|Null` | Yes | Interest level. Null when it hasn't been set. |
| `status` | `String` | Yes | Status |
| `status_data` | `StatusData` | No | Status data. Only if status is not `ongoing` |
| `crm_stage` | `CrmStage` | No | Current stage |
| `crm_stage_logs` | `CrmStageLog[]` | No | History of stages |
| `id` | `String` | Yes | Id of the candidacy |

### Fields: StatusData

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `String` | Yes | Date when the status was assigned |
| `reason` | `String\|Null` | No | Reason for the status. Only if status is one of `lost`, `rejected`. |
| `comment` | `String` | No | Comment added when setting the status. Only if status is one of `lost`, `rejected`. |
| `school` | `String\|Null` | No | Destination school. Only if status is `lost`. |

### Fields: CrmStageLog

| Field | Type | Required | Description |
|---|---|---|---|
| `crm_stage_id` | `String` | Yes | Stage id |
| `date` | `String` | Yes | Date when the stage was assigned |
| `crm_stage` | `CrmStage` | No | Crm stage |

### Example: Successful creation:

```json
{
   "code": 200,
   "url": "/api/web/v1/crm_candidacies/update",
   "success": true,
   "data": {
       "account_id": "DIN-A-000001",
       "crm_class_id": "cla_we2k4vIW6CtmX48X",
       "created": "2019-11-11T12:34:56+0000"
   }
```

### Error response

### Example: Invalid creation due to repeat candidate/class:

```json
{
       "message": "There is already a candidate in this period",
       "url": "/api/web/v1/crm_candidacies/update",
       "code": 400
   }
```

---

## POST /v1/crm_candidacies/update

**Create a candidacy**

**Version:** `1.1.0`

Adds the specified candidate to the specified class.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Created candidacy |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |
| `crm_stage_id` | `String\|null` | Yes | id of the current stage |
| `interest_level` | `String\|Null` | Yes | Interest level. Null when it hasn't been set. |
| `status` | `String` | Yes | Status |
| `status_data` | `StatusData` | No | Status data. Only if status is not `ongoing` |
| `crm_stage` | `CrmStage` | No | Current stage |
| `crm_stage_logs` | `CrmStageLog[]` | No | History of stages |

### Fields: StatusData

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `String` | Yes | Date when the status was assigned |
| `reason` | `String\|Null` | No | Reason for the status. Only if status is one of `lost`, `rejected`. |
| `comment` | `String` | No | Comment added when setting the status. Only if status is one of `lost`, `rejected`. |
| `school` | `String\|Null` | No | Destination school. Only if status is `lost`. |

### Fields: CrmStageLog

| Field | Type | Required | Description |
|---|---|---|---|
| `crm_stage_id` | `String` | Yes | Stage id |
| `date` | `String` | Yes | Date when the stage was assigned |
| `crm_stage` | `CrmStage` | No | Crm stage |

### Example: Successful creation:

```json
{
   "code": 200,
   "url": "/api/web/v1/crm_candidacies/update",
   "success": true,
   "data": {
       "account_id": "DIN-A-000001",
       "crm_class_id": "cla_we2k4vIW6CtmX48X",
       "created": "2019-11-11T12:34:56+0000"
   }
```

### Error response

### Example: Invalid creation due to repeat candidate/class:

```json
{
       "message": "There is already a candidate in this period",
       "url": "/api/web/v1/crm_candidacies/update",
       "code": 400
   }
```

---

## POST /v1/crm_candidacies/update

**Create a candidacy**

**Version:** `1.0.0`

Adds the specified candidate to the specified class.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Created candidacy |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: CrmCandidacy

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | id of the candidate |
| `crm_class_id` | `String` | Yes | id of the class |
| `created` | `String` | Yes | Creation date |

### Example: Successful creation:

```json
{
   "code": 200,
   "url": "/api/web/v1/crm_candidacies/update",
   "success": true,
   "data": {
       "account_id": "DIN-A-000001",
       "crm_class_id": "cla_we2k4vIW6CtmX48X",
       "created": "2019-11-11T12:34:56+0000"
   }
```

### Error response

### Example: Invalid creation due to repeat candidate/class:

```json
{
       "message": "There is already a candidate in this period",
       "url": "/api/web/v1/crm_candidacies/update",
       "code": 400
   }
```

---
