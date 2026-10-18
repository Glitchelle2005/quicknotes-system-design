# QuickNotes API design

This document describes the production QuickNotes API, not the JSONPlaceholder practice service. The API is versioned under `/v1`, uses JSON, and requires a bearer access token except for health checks.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| GET | `/v1/notes` | List the authenticated user's notes; supports `limit`, `cursor` and `tag` query parameters. | 200 OK |
| POST | `/v1/notes` | Create a note owned by the authenticated user. | 201 Created |
| GET | `/v1/notes/{noteId}` | Retrieve one note owned by the authenticated user. | 200 OK |
| PATCH | `/v1/notes/{noteId}` | Update one or more mutable note fields. | 200 OK |
| DELETE | `/v1/notes/{noteId}` | Delete a note owned by the authenticated user. | 204 No Content |
| GET | `/v1/tags` | List the authenticated user's tags. | 200 OK |
| PUT | `/v1/notes/{noteId}/tags/{tagId}` | Associate an existing owned tag with an owned note; safe to retry. | 204 No Content |
| DELETE | `/v1/notes/{noteId}/tags/{tagId}` | Remove the association between an owned note and tag. | 204 No Content |
| GET | `/health` | Report whether the service can accept traffic; contains no user data. | 200 OK |

All note and tag routes enforce ownership. List results are cursor-paginated, ordered by `updated_at DESC, id DESC`; clients should follow the returned `nextCursor` rather than use offsets.

## Create a note

`POST /v1/notes`

Request:

```json
{
  "title": "Meeting notes",
  "body": "Review the launch checklist.",
  "tagIds": ["7d2b8a6e-40db-4c4f-a1d6-29fb7fa1cf10"]
}
```

Response (`201 Created`):

```json
{
  "id": "2c7a0864-a201-4cd3-b6e5-27f3cc3f5108",
  "userId": "95a4e947-15e6-4ec7-90fa-60e0a4961074",
  "title": "Meeting notes",
  "body": "Review the launch checklist.",
  "createdAt": "2026-10-18T19:00:00Z",
  "updatedAt": "2026-10-18T19:00:00Z",
  "tags": [
    {
      "id": "7d2b8a6e-40db-4c4f-a1d6-29fb7fa1cf10",
      "name": "work"
    }
  ]
}
```

The server derives `userId` from the validated token; it does not accept a client-supplied owner. Titles are required and limited to 100 characters. Bodies are optional.

## List notes

`GET /v1/notes?limit=2&tag=work`

Response (`200 OK`):

```json
{
  "items": [
    {
      "id": "2c7a0864-a201-4cd3-b6e5-27f3cc3f5108",
      "userId": "95a4e947-15e6-4ec7-90fa-60e0a4961074",
      "title": "Meeting notes",
      "body": "Review the launch checklist.",
      "createdAt": "2026-10-18T19:00:00Z",
      "updatedAt": "2026-10-18T19:00:00Z",
      "tags": [{ "id": "7d2b8a6e-40db-4c4f-a1d6-29fb7fa1cf10", "name": "work" }]
    }
  ],
  "nextCursor": "eyJ1cGRhdGVkQXQiOiIyMDI2LTEwLTE4VDE5OjAwOjAwWiJ9"
}
```

An empty result is `200 OK` with `"items": []` and `"nextCursor": null`.

## Errors

Errors use `application/problem+json` and do not disclose internal details.

| Status | Meaning |
|---|---|
| 400 Bad Request | Malformed JSON, invalid fields, or invalid pagination parameters. |
| 401 Unauthorized | Missing, invalid, or expired access token. |
| 403 Forbidden | Authenticated caller lacks permission for the requested operation. |
| 404 Not Found | Resource does not exist or is not visible to the caller. |
| 409 Conflict | A uniqueness or state conflict, such as a duplicate tag name. |
| 429 Too Many Requests | Rate limit exceeded; may include `Retry-After`. |
| 500 Internal Server Error | Unexpected server failure. |
| 503 Service Unavailable | Temporary dependency or capacity issue. |

Example (`400 Bad Request`):

```json
{
  "type": "https://api.quicknotes.example/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request contains invalid fields.",
  "errors": {
    "title": ["Title is required and must be 100 characters or fewer."]
  },
  "requestId": "req_01JABCD123"
}
```
