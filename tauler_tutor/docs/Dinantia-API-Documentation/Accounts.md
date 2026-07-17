# Accounts

7 endpoint(s).

## Contents

- [DELETE /v1/accounts/delete/:id](#delete-v1-accounts-delete-id) — Delete an account
- [GET /v1.2/accounts/index](#get-v1-2-accounts-index) — Get all accounts
- [GET /v1/accounts/index](#get-v1-accounts-index) — Get all accounts
- [POST /v1.2/accounts/update/:id](#post-v1-2-accounts-update-id) — Create/update account
- [POST /v1/accounts/update/:id](#post-v1-accounts-update-id) — Create/update account
- [GET /v1.2/accounts/view/:id](#get-v1-2-accounts-view-id) — Get account
- [GET /v1/accounts/view/:id](#get-v1-accounts-view-id) — Get account

## DELETE /v1/accounts/delete/:id

**Delete an account**

**Version:** `1.0.0`

Disables/deletes an account.

This is equivalent to removing ALL the roles of an account. For example, if you happen to have a user who is both a Parent and a Student and only want to delete it as a Student, you should edit its roles and leave only the Parent role; otherwise, using this call would remove it as a Parent too.

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
    "url": "/api/web/v1/accounts/delete/JOHN-123",
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

## GET /v1.2/accounts/index

**Get all accounts**

**Version:** `1.2.0`

Gets the list of accounts

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `String` | No | Filter by email |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of account objects |
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

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Fields: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, as defined through the web app. |
| `value` | `String` | Yes | The value for the field |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1.2/accounts/index",
    "success": true,
    "data": [
        {
            "id": "JOHN-123",
            "name": "John",
            "email": "john@dinantia.com",
            "phone": "+34661234567",
            "gender": "male",
            "language": "en_EN",
            "avatar": "files/avatars/default.png",
            "roles": [
                "Staff", "Admin", "Parent"
            ],
            "groups": {
                "member": ["TEACHERS"],
                "messages": ["P-1-A", "GROUP-X"]
            },
            "permissions": [],
            "parents": [],
            "fields": [],
            "created": "2017-03-22T12:07:38+00:00",
            "modified": "2017-03-22T12:07:38+00:00"
        },
        {
            "id": "49180",
            "name": "Johnny",
            "email": null,
            "phone": null,
            "gender": "other",
            "language": "es_ES",
            "avatar": "files/avatars/default.png",
            "roles": [
                "Student
            ],
            "groups": {
                "member": ["GROUP-X"]
            },
            "permissions": [],
            "parents": ["JOHN-123"],
            "fields": [],
            "created": "2017-04-22T13:07:38+00:00",
            "modified": "2017-11-22T12:26:31+00:00"
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

## GET /v1/accounts/index

**Get all accounts**

**Version:** `1.0.0`

Gets the list of accounts

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `String` | No | Filter by email |
| `limit` | `Number` | No | Limit result set length. Defaults to 20; max 100. |
| `page` | `Number` | No | Result set page. Defaults to first page. |

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object[]` | Yes | List of account objects |
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

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Fields: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, as defined through the web app. |
| `value` | `String` | Yes | The value for the field |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/accounts/index",
    "success": true,
    "data": [
        {
            "id": "JOHN-123",
            "name": "John",
            "email": "john@dinantia.com",
            "phone": "+34661234567",
            "gender": "male",
            "language": "en_EN",
            "avatar": "files/avatars/default.png",
            "roles": [
                "Staff", "Admin", "Parent"
            ],
            "groups": {
                "member": ["TEACHERS"],
                "messages": ["P-1-A", "GROUP-X"]
            },
            "permissions": [],
            "parents": [],
            "fields": [],
            "created": "2017-03-22T12:07:38+00:00",
            "modified": "2017-03-22T12:07:38+00:00"
        },
        {
            "id": "49180",
            "name": "Johnny",
            "email": null,
            "phone": null,
            "gender": "other",
            "language": "es_ES",
            "avatar": "files/avatars/default.png",
            "roles": [
                "Student
            ],
            "groups": {
                "member": ["GROUP-X"]
            },
            "permissions": [],
            "parents": ["JOHN-123"],
            "fields": [],
            "created": "2017-04-22T13:07:38+00:00",
            "modified": "2017-11-22T12:26:31+00:00"
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

## POST /v1.2/accounts/update/:id

**Create/update account**

**Version:** `1.2.0`

Updates a specified account, or creates one if no id specified.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Unique identifier for the account. Required on creation. |
| `name` | `String` | Yes | Name. Required on creation if Student or Staff |
| `email` | `String` | Yes | Unique email. Required on creation if Staff. Required for Parents if email not specified. |
| `phone` | `String` | Yes | Unique phone. Required on creation if Parent and email not specified. E.164 format required |
| `gender` | `String` | Yes | Gender. female, male, other |
| `roles` | `String[]` | Yes | Roles. Must be one or more of: Administrator, Staff, Student, Parent, Candidate, CandidateParent. Required on creation. |
| `groups` | `Object` | Yes | Groups. See documentation for Index for valid scopes. When updating groups of a certain scope, existing groups for that scope will be overriden. |
| `permissions` | `String[]` | Yes | Array of module names for permissions. See documentation for Index for a complete list |
| `parents` | `Parent[]` | Yes | List of parents. If specified, the current parents of the account will be replaced. |
| `fields` | `Field[]` | Yes | List of custom fields. |

### Parameters: Parent object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Parent id. When updating, either this, email or phone must be specified |
| `email` | `String` | Yes | Parent email. When creating regular Parents, either this or phone must be specified |
| `phone` | `String` | Yes | Parent phone. When creating regular Parents, either this or email must be specified |
| `role` | `String` | Yes | Parent role. Either Parent or CandidateParent. Defaults to Parent. |
| `name` | `String` | Yes | Parent name |
| `gender` | `String` | Yes | Parent gender |
| `fields` | `Field[]` | Yes | List of custom fields. Valid for CandidateParents |

### Parameters: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, defined through the web app. |
| `value` | `String` | Yes | The value you want to assign to the field |

### Request example: Example edit

```json
{
       "id": "JOHN-123456",
       "name": "John Smith",
       "email": "john-smith@dinantia.com",
       "groups": {
           "member": ["TEACHERS", "NEW-MEMBER-GROUP"]
       },
       "fields": [
           {
               "id": "favourite-color",
               "value": "Green"
           }
       ]
   }
```

### Request example: Student creation

```json
{
       "id": "JOHNNY-123456",
       "name": "Johnny",
       "roles": ["Student"],
       "parents": [
           {
               "email": "mother@dinantia.com",
               "gender": "female",
               "role": "Parent"
           },
           {
               "email": "father@dinantia.com",
               "gender": "male",
               "role": "Parent"
           }
       ]
   }
```

### Request example: CRM Candidate Creation

```json
{
       "id": "CANDIDATE-123456",
       "roles": ["Candidate"],
       "fields": [
           {
               "id": "name",
               "value": "Thomas"
           },
           {
               "id": "surname",
               "value": "Smith"
           },
           {
               "id": "origin-school",
               "value": "Harvard"
           }
       ],
       "parents": [
           {
               "role": "CandidateParent",
               "gender": "female",
               "fields": [
                   {
                       "id": "email",
                       "value": "martha.smith@dinantia.com"
                   },
                   {
                       "id": "name",
                       "value": "Martha"
                   },
                   {
                       "id": "surname",
                       "value": "Smith"
                   },
                   {
                       "id": "favourite-color",
                       "value": "red"
                   }
               ]
           }
       ]
   }
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Account. Null if update not successful |
| `errors` | `Object[]` | Yes | List of errors if request is not properly formatted. |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Example: Edit response

```json
{
   "code": 200,
   "url": "/api/web/v1.2/accounts/update/JOHN-123",
   "success": true,
   "data": {
       "id": "JOHN-123456",
       "name": "John Smith",
       "email": "john-smith@dinantia.com",
       "phone": "+34661234567",
       "gender": "male",
       "language": "en_EN",
       "avatar": "files/avatars/default.png",
       "roles": [
           "Staff", "Admin", "Parent"
       ],
       "groups": {
           "member": ["TEACHERS", "NEW-MEMBER-GROUP"],
           "messages": ["P-1-A", "GROUP-X"]
       },
       "permissions": [],
       "parents": [],
       "fields": [
           {
               "id": "favourite-color",
               "value": "Green"
           }
       ],
       "created": "2017-03-22T12:07:38+00:00",
       "modified": "2018-01-01T10:00:00+00:00"
   }
}
```

### Example: CRM Candidate creation response

```json
{
       "code": 200,
       "url": "/api/web/v1.2/accounts/update",
       "success": true,
       "data": {
           "id": "CANDIDATE-123456",
           "name": "Thomas Smith",
           "email": null,
           "phone": null,
           "gender": "other",
           "language": "es_ES",
           "avatar": "files/avatars/default.png",
           "roles": [
               "Candidate"
           ],
           "groups": {},
           "permissions": [],
           "fields": [
               {
                   "id": "name",
                   "value": "Thomas"
               },
               {
                   "id": "surname",
                   "value": "Smith"
               },
               {
                   "id": "origin-school",
                   "value": "Harvard"
               }
           ],
           "parents": [
               "DIN-A-000222"
           ],
           "created": "2019-11-21T08:00:00+0000",
           "modified": "2019-11-21T08:00:00+0000"
       }
   }
```

### Example: Invalid creation resposne

```json
{
        "code": 200,
        "url": "/api/web/v1.2/accounts/update",
        "errors": [
            {
                "field": "id",
                "code": "_required",
                "message": "This field is required",
                "value": null
            },
            {
                "field": "roles",
                "code": "arrayMatch",
                "message": "The provided value is invalid",
                "value": [
                    "blabla"
                ]
            },
            {
                "field": "email",
                "code": "email",
                "message": "The provided value is invalid",
                "value": "invalidemail.com"
            },
            {
                "field": "gender",
                "code": "inList",
                "message": "The provided value is invalid",
                "value": "maaaale"
            },
            {
                "field": "permissions",
                "code": "arrayMatch",
                "message": "The provided value is invalid",
                "value": [
                    "invalidpermission"
                ]
            },
            {
                "field": "groups",
                "code": "validScopes",
                "message": "Invalid scope found. Valid: attendances, catering, managed, attitude, newsletter, wall, calendar, supervised, tutor, member, messages",
                "value": {
                    "invalidscope": [
                        "invalidgroup"
                    ]
                }
            }
        ],
        "success": false,
        "data": null
    }
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Invalid creation resposne

```json
{
        "code": 404,
        "url": "/api/web/v1.2/accounts/update",
        "message": "Unknown field invalid-field"
    }
```

### Example: Not response

```json
{
    "message": "Not found",
    "url": "/api/web/v1/groups/view/does-not-exist",
    "code": 404
   }
```

---

## POST /v1/accounts/update/:id

**Create/update account**

**Version:** `1.0.0`

Updates a specified account, or creates one if no id specified.

### Request

### Parameters: Parameter

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Unique identifier for the account. Required on creation. |
| `name` | `String` | Yes | Name. Required on creation if Student or Staff |
| `email` | `String` | Yes | Unique email. Required on creation if Staff. Required for Parents if email not specified. |
| `phone` | `String` | Yes | Unique phone. Required on creation if Parent and email not specified. E.164 format required |
| `gender` | `String` | Yes | Gender. female, male, other |
| `roles` | `String[]` | Yes | Roles. Must be one or more of: Administrator, Staff, Student, Parent, Candidate, CandidateParent. Required on creation. |
| `groups` | `Object` | Yes | Groups. See documentation for Index for valid scopes. When updating groups of a certain scope, existing groups for that scope will be overriden. |
| `permissions` | `String[]` | Yes | Array of module names for permissions. See documentation for Index for a complete list |
| `parents` | `Parent[]` | Yes | List of parents. If specified, the current parents of the account will be replaced. |
| `fields` | `Field[]` | Yes | List of custom fields. |

### Parameters: Parent object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | Parent id. When updating, either this, email or phone must be specified |
| `email` | `String` | Yes | Parent email. When creating regular Parents, either this or phone must be specified |
| `phone` | `String` | Yes | Parent phone. When creating regular Parents, either this or email must be specified |
| `role` | `String` | Yes | Parent role. Either Parent or CandidateParent. Defaults to Parent. |
| `name` | `String` | Yes | Parent name |
| `gender` | `String` | Yes | Parent gender |
| `fields` | `Field[]` | Yes | List of custom fields. Valid for CandidateParents |

### Parameters: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, defined through the web app. |
| `role` | `String` | Yes | role name. Must be one of: Staff, Student, Candidate, CandidateParent. |
| `scope` | `String` | Yes | field scope. Only needed when role => Candidate, where it is either 'crm.default' for regular candidate fields, or 'crm.academic' for academic fields. |
| `value` | `String` | Yes | The value you want to assign to the field |

### Request example: Example edit

```json
{
       "id": "JOHN-123456",
       "name": "John Smith",
       "email": "john-smith@dinantia.com",
       "groups": {
           "member": ["TEACHERS", "NEW-MEMBER-GROUP"]
       },
       "fields": [
           {
               "id": "favourite-color",
               "role": "Staff",
               "value": "Green"
           }
       ]
   }
```

### Request example: Student creation

```json
{
       "id": "JOHNNY-123456",
       "name": "Johnny",
       "roles": ["Student"],
       "parents": [
           {
               "email": "mother@dinantia.com",
               "gender": "female",
               "role": "Parent"
           },
           {
               "email": "father@dinantia.com",
               "gender": "male",
               "role": "Parent"
           }
       ]
   }
```

### Request example: CRM Candidate Creation

```json
{
       "id": "CANDIDATE-123456",
       "roles": ["Candidate"],
       "fields": [
           {
               "id": "name",
               "role": "Candidate",
               "scope": "crm.default",
               "value": "Thomas"
           },
           {
               "id": "surname",
               "role": "Candidate",
               "scope": "crm.default",
               "value": "Smith"
           },
           {
               "id": "origin-school",
               "role": "Candidate",
               "scope": "crm.academic",
               "value": "Harvard"
           }
       ],
       "parents": [
           {
               "role": "CandidateParent",
               "gender": "female",
               "fields": [
                   {
                       "id": "email",
                       "role": "CandidateParent",
                       "value": "martha.smith@dinantia.com"
                   },
                   {
                       "id": "name",
                       "role": "CandidateParent",
                       "value": "Martha"
                   },
                   {
                       "id": "surname",
                       "role": "CandidateParent",
                       "value": "Smith"
                   },
                   {
                       "id": "favourite-color",
                       "role": "CandidateParent",
                       "value": "red"
                   }
               ]
           }
       ]
   }
```

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Account. Null if update not successful |
| `errors` | `Object[]` | Yes | List of errors if request is not properly formatted. |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Example: Edit response

```json
{
   "code": 200,
   "url": "/api/web/v1/accounts/update/JOHN-123",
   "success": true,
   "data": {
       "id": "JOHN-123456",
       "name": "John Smith",
       "email": "john-smith@dinantia.com",
       "phone": "+34661234567",
       "gender": "male",
       "language": "en_EN",
       "avatar": "files/avatars/default.png",
       "roles": [
           "Staff", "Admin", "Parent"
       ],
       "groups": {
           "member": ["TEACHERS", "NEW-MEMBER-GROUP"],
           "messages": ["P-1-A", "GROUP-X"]
       },
       "permissions": [],
       "parents": [],
       "fields": [
           {
               "id": "favourite-color",
               "role": "Staff",
               "scope": null,
               "value": "Green"
           }
       ],
       "created": "2017-03-22T12:07:38+00:00",
       "modified": "2018-01-01T10:00:00+00:00"
   }
}
```

### Example: CRM Candidate creation response

```json
{
       "code": 200,
       "url": "/api/web/v1/accounts/update",
       "success": true,
       "data": {
           "id": "CANDIDATE-123456",
           "name": "Thomas Smith",
           "email": null,
           "phone": null,
           "gender": "other",
           "language": "es_ES",
           "avatar": "files/avatars/default.png",
           "roles": [
               "Candidate"
           ],
           "groups": {},
           "permissions": [],
           "fields": [
               {
                   "id": "name",
                   "role": "Candidate",
                   "scope": "crm.default",
                   "value": "Thomas"
               },
               {
                   "id": "surname",
                   "role": "Candidate",
                   "scope": "crm.default",
                   "value": "Smith"
               },
               {
                   "id": "origin-school",
                   "role": "Candidate",
                   "scope": "crm.academic",
                   "value": "Harvard"
               }
           ],
           "parents": [
               "DIN-A-000222"
           ],
           "created": "2019-11-21T08:00:00+0000",
           "modified": "2019-11-21T08:00:00+0000"
       }
   }
```

### Example: Invalid creation resposne

```json
{
        "code": 200,
        "url": "/api/web/v1/accounts/update",
        "errors": [
            {
                "field": "id",
                "code": "_required",
                "message": "This field is required",
                "value": null
            },
            {
                "field": "roles",
                "code": "contains",
                "message": "The provided value is invalid",
                "value": [
                    "blabla"
                ]
            },
            {
                "field": "roles",
                "code": "arrayMatch",
                "message": "The provided value is invalid",
                "value": [
                    "blabla"
                ]
            },
            {
                "field": "email",
                "code": "email",
                "message": "The provided value is invalid",
                "value": "invalidemail.com"
            },
            {
                "field": "gender",
                "code": "inList",
                "message": "The provided value is invalid",
                "value": "maaaale"
            },
            {
                "field": "permissions",
                "code": "arrayMatch",
                "message": "The provided value is invalid",
                "value": [
                    "invalidpermission"
                ]
            },
            {
                "field": "groups",
                "code": "validScopes",
                "message": "Invalid scope found. Valid: attendances, catering, managed, attitude, newsletter, wall, calendar, supervised, tutor, member, messages",
                "value": {
                    "invalidscope": [
                        "invalidgroup"
                    ]
                }
            }
        ],
        "success": false,
        "data": null
    }
```

### Error response

### Fields: Error 4xx

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `String` | Yes | Not found |

### Example: Invalid creation resposne

```json
{
        "code": 404,
        "url": "/api/web/v1/accounts/update",
        "message": "Unknown field invalid-field"
    }
```

### Example: Not response

```json
{
    "message": "Not found",
    "url": "/api/web/v1/groups/view/does-not-exist",
    "code": 404
   }
```

---

## GET /v1.2/accounts/view/:id

**Get account**

**Version:** `1.2.0`

Gets a specific account

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Account object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Fields: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, as defined through the web app. |
| `value` | `String` | Yes | The value for the field |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/accounts/view/JOHN-123",
    "success": true,
    "data": {
        "id": "JOHN-123",
        "name": "John",
        "email": "john@dinantia.com",
        "phone": "+34661234567",
        "gender": "male",
        "language": "en_EN",
        "avatar": "files/avatars/default.png",
        "roles": [
            "Staff", "Administrator", "Parent"
        ],
        "groups": {
            "member": ["TEACHERS"],
            "messages": ["P-1-A", "GROUP-X"]
        },
        "permissions": [],
        "parents": [],
        "fields": [
            {
                "id": "favourite-color",
                "value": "Red"
            }
        ],
        "created": "2017-03-22T12:07:38+00:00",
        "modified": "2017-03-22T12:07:38+00:00"
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

## GET /v1/accounts/view/:id

**Get account**

**Version:** `1.0.0`

Gets a specific account

### Success response

### Fields: Success 200

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `Object` | Yes | Account object |
| `code` | `Number` | Yes | Request status code |
| `url` | `String` | Yes | Request url |
| `success` | `Boolean` | Yes | Request success status |

### Fields: Account

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes |  |
| `name` | `String` | Yes |  |
| `email` | `String` | Yes |  |
| `phone` | `String` | Yes | (E.164 notation) |
| `gender` | `String` | Yes | female, male, other |
| `language` | `String` | Yes | Language code |
| `avatar` | `String` | Yes | Relative path of user's avatar |
| `roles` | `String[]` | Yes | User roles, among: Administrator, Staff, Student, Parent |
| `groups` | `Object` | Yes | User groups. Keys are scopes, values are arrays of ids of groups. Valid scopes:  ``` ⠀* member    * tutor    * teacher    * managed    * view_students        * attendances    * attitude    * calendar    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `permissions` | `String[]` | Yes | Array of module names for permissions:  ``` ⠀* attendances    * attitude    * calendar    * crm    * messages    * newsletter    * nursery    * payments    * wall ``` |
| `parents` | `String[]` | Yes | Array of ids of parents of the account. |
| `fields` | `Field[]` | Yes | List of custom fields. |
| `created` | `String` | Yes | Creation date |
| `modified` | `String` | Yes | Last modification date |

### Fields: Field object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `String` | Yes | custom id, as defined through the web app. |
| `value` | `String` | Yes | The value for the field |

### Example: Example response:

```json
{
    "code": 200,
    "url": "/api/web/v1/accounts/view/JOHN-123",
    "success": true,
    "data": {
        "id": "JOHN-123",
        "name": "John",
        "email": "john@dinantia.com",
        "phone": "+34661234567",
        "gender": "male",
        "language": "en_EN",
        "avatar": "files/avatars/default.png",
        "roles": [
            "Staff", "Administrator", "Parent"
        ],
        "groups": {
            "member": ["TEACHERS"],
            "messages": ["P-1-A", "GROUP-X"]
        },
        "permissions": [],
        "parents": [],
        "fields": [
            {
                "id": "favourite-color",
                "role": "Staff",
                "scope": null,
                "value": "Red"
            }
        ],
        "created": "2017-03-22T12:07:38+00:00",
        "modified": "2017-03-22T12:07:38+00:00"
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
