# Attendances

4 endpoint(s).

## Contents

- [DELETE /v1/attendances/delete/:id](#delete-v1-attendances-delete-id) — Delete an attendance
- [GET /v1/attendances/index](#get-v1-attendances-index) — Get all attendances
- [POST /v1/attendances/update/:id](#post-v1-attendances-update-id) — Create/update attendance
- [GET /v1/attendances/view/:id](#get-v1-attendances-view-id) — Get attendance

## DELETE /v1/attendances/delete/:id

**Delete an attendance**

**Version:** `1.0.0`

Deletes a attendance.

All attendee entries registered with the attendance will also be deleted.

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
    "url": "/api/web/v1/attendances/delete/att_ZheoNXTI0XKDtJ1h",
    "success": true
 }
```

---

## GET /v1/attendances/index

**Get all attendances**

**Version:** `1.0.0`

Gets the list of attendances, sorted by most recent.

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
| `data` | `Attendance[]` | Yes | List of attendance objects |
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

### Fields: Attendance

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the attendance. |
| `date` | `String` | Yes | Date of the attendance. |
| `account_id` | `String` | Yes | Id of the teacher that registered the attendance |
| `course_id` | `String` | Yes | Id of the course for the attendance |
| `groups` | `String[]` | Yes | List of group Ids for the attendance |
| `attendees` | `Attendee[]` | Yes | List of attendees; i.e. the accounts for which we are registering attendance |

### Fields: Attendee

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | Id of the account |
| `status` | `String` | Yes | Status of the attendee. |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/attendances/index",
    "success": true,
    "data": [
        {
            "id": "att_XVwHdRUifTlX9ALi",
            "date": "2020-01-05T12:00:00+0000",
            "course_id": "cou_123",
            "groups": [
                "MAIN-A
            ],
            "account_id": "TEACHER-1",
            "attendees": [
                {
                    "account_id": "STUDENT1",
                    "status": "present"
                },
                {
                    "account_id": "STUDENT2",
                    "status": "justified"
                },
                {
                    "account_id": "STUDENT3",
                    "status": "late"
                },
            ]
        },
        {
            "id": "att_w9ojUpK1RAt1dA9I",
            "date": "2020-01-05T10:00:00+0000",
            "course_id": "cou_456",
            "groups": [
                "MAIN-A
            ],
            "account_id": "TEACHER-2",
            "attendees": [
                {
                    "account_id": "STUDENT1",
                    "status": "present"
                },
                {
                    "account_id": "STUDENT2",
                    "status": "present"
                }
            ]
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

## POST /v1/attendances/update/:id

**Create/update attendance**

**Version:** `1.0.0`

Updates a specified attendance, or creates one if no id specified.

**Note that two or more attendances can't share the same combination of date, course and groups**. If you attempt to create or edit an attendance that would cause a duplicate, you'll get an error.

- We do not include the concept of attendance duration, so two dates will be considered as overlapping if they are an exact match (to the second).
- Group overlapping depends on the group structure and levels. We allow registering an attendance on a supergroup of a group that already has been registered, since that supergroup could contain more students, but not the other way around.

---

When updating an attendance, you can change the date, course and the status of any of its original attendees. You cannot change the groups, and you cannot add or remove attendees from that attendance; if you need to do so, you can simply delete the attendance and create a new one. Bear in mind that, if absence notifications are enabled, this would couse the parents of absent students to be notified again.

---

If you want to change the status of a specific student, you can update the attendance and pass an `attendees` array of just one student. You do not need to pass all the other attendees to the request, but only the one being changed. If that student belongs to the attendance, its status will be updated; otherwise you'll get an error saying that the student does not belong to the attendance.

---

Bear in mind that **the following permissions apply**:

- The specified teacher (`account_id`) should have permissions to register attendance over the specified groups. This means he should either be an `Administrator` *or* have the following permissions:

```
{  
     "role": "Staff"  
     "permissions": ["attendances"],  
     "groups": {  
         "attendances": ["GROUP-1", "GROUP-2", ...]  
     }  
 }
```

- The specified attendees must be members of the specified groups. For example:

```
{  
     "groups": {  
         "member": ["GROUP-1"]  
     }  
 }
```

---

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `String` | Yes | Date of the attendance. |
| `account_id` | `String` | Yes | Id of the teacher registering the attendance |
| `course` | `String` | Yes | Name of the course for the attendance. Either this or `course_id` must be specified. |
| `course_id` | `String` | Yes | Id of the course for the attendance. Either this or `course` must be specified. |
| `groups` | `String[]` | Yes | List of group Ids for the attendance. |
| `attendees` | `Attendee[]` | Yes | List of attendees; i.e. the accounts for which we are registering attendance. |
| `notify` | `Boolean` | No | Whether to notify parents of all attendees with status `absent` or not. Default behavior is to do as configured in the school's settings. |

### Parameters: Attendee

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | Id of the account. Note that the account must be a member of at least one of the groups specified for the attendance. |
| `status` | `String` | Yes | (required) Status of the attendee. |

### Request example: Register a new attendance

```json
{
    "date": "2020-01-05T10:00:00+0000",
    "course_id": "cou_123",
    "groups": [
        'MAIN-A',
    ],
    "account_id": 'TEACHER-1',
    "attendees": [
        {
            "account_id": "STUDENT1",
            "status": "present"
        },
        {
            "account_id": "STUDENT2",
            "status": "absent"
        },
        {
            "account_id": "STUDENT3",
            "status": "late"
        },
    ]
}
```

### Request example: Update an attendee's status

```json
{
    "attendees": [
        {
            "account_id": "STUDENT2",
            "status": "justified"
        }
    ]
}
```

### Request example: Edit an attendance's course

```json
{
    "course_id": "cou_456"
}
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Attendance` | Yes | Attendance |
| `errors` | `Object[]` | Yes | List of errors (if the request is not properly formatted). |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Attendance

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the attendance. |
| `date` | `String` | Yes | Date of the attendance. |
| `account_id` | `String` | Yes | Id of the teacher that registered the attendance |
| `course_id` | `String` | Yes | Id of the course for the attendance |
| `groups` | `String[]` | Yes | List of group Ids for the attendance |
| `attendees` | `Attendee[]` | Yes | List of attendees; i.e. the accounts for which we are registering attendance |

### Fields: Attendee

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | Id of the account |
| `status` | `String` | Yes | Status of the attendee. |

### Example: Successful creation

```json
{
    "code": 200,
    "url": "/api/web/v1/attendances/update",
    "success": true,
    "data": {
        "id": "att_XVwHdRUifTlX9ALi",
        "date": "2020-01-05T10:00:00+0000",
        "course_id": "cou_123",
        "groups": [
            'MAIN-A',
        ],
        "account_id": 'TEACHER-1',
        "attendees": [
            {
                "account_id": "STUDENT1",
                "status": "present"
            },
            {
                "account_id": "STUDENT2",
                "status": "absent"
            },
            {
                "account_id": "STUDENT3",
                "status": "late"
            },
        ]
    }
}
```

### Example: Successful edit

```json
{
    "code": 200,
    "url": "/api/web/v1/attendances/update/att_XVwHdRUifTlX9ALi",
    "success": true,
    "data": {
        "id": "att_XVwHdRUifTlX9ALi",
        "date": "2020-01-05T10:00:00+0000",
        "course_id": "cou_123",
        "groups": [
            'MAIN-A',
        ],
        "account_id": 'TEACHER-1',
        "attendees": [
            {
                "account_id": "STUDENT1",
                "status": "present"
            },
            {
                "account_id": "STUDENT2",
                "status": "justified"
            },
            {
                "account_id": "STUDENT3",
                "status": "late"
            },
        ]
    }
}
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Error message |

### Example: Attendance not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/attendances/update/does-not-exist",
    "code": 404
   }
```

### Example: Duplicate attendance

```json
{
    "message": "You've already registered attendance for this date, subject and groups",
    "url": "/api/web/v1/attendances/update",
    "code": 404
   }
```

---

## GET /v1/attendances/view/:id

**Get attendance**

**Version:** `1.0.0`

Get an attendance

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Attendance` | Yes | Attendance object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Attendance

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Id of the attendance. |
| `date` | `String` | Yes | Date of the attendance. |
| `account_id` | `String` | Yes | Id of the teacher that registered the attendance |
| `course_id` | `String` | Yes | Id of the course for the attendance |
| `groups` | `String[]` | Yes | List of group Ids for the attendance |
| `attendees` | `Attendee[]` | Yes | List of attendees; i.e. the accounts for which we are registering attendance |

### Fields: Attendee

| Field | Type | Required | Description |
|---|---|---|---|
| `account_id` | `String` | Yes | Id of the account |
| `status` | `String` | Yes | Status of the attendee. |

### Example: Successful get:

```json
{
    "code": 200,
    "url": "/api/web/v1/attendances/view/att_XVwHdRUifTlX9ALi",
    "success": true,
    "data": {
        "id": "att_XVwHdRUifTlX9ALi",
        "date": "2020-01-05T10:00:00+0000",
        "course_id": "cou_123",
        "groups": [
            'MAIN-A',
        ],
        "account_id": 'TEACHER-1',
        "attendees": [
            {
                "account_id": "STUDENT1",
                "status": "present"
            },
            {
                "account_id": "STUDENT2",
                "status": "justified"
            },
            {
                "account_id": "STUDENT3",
                "status": "late"
            },
        ]
    }
  }
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Attendance not found

```json
{
    "message": "Not found",
    "url": "/api/web/v1/attendances/view/does-not-exist",
    "code": 404
   }
```

---
