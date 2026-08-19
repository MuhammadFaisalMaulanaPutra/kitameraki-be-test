# Kitameraki Task Management API

Azure Functions (v4 programming model) back-end for the Task Management App, written in TypeScript and backed by Azure Cosmos DB.

## Project structure

```
src/
├── functions/      # HTTP-triggered Azure Functions — thin, orchestration only
├── services/       # Business logic (validation orchestration, mapping)
├── repositories/   # All direct Cosmos DB access
├── config/         # Cosmos client singleton
├── models/         # Shared TypeScript types
├── middleware/     # Error handling wrapper, schema validation
└── utils/          # Error classes, request-parsing helpers
```

## Prerequisites

- Node.js 20.x
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- An Azure Cosmos DB account (or the [Azure Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/emulator) for local development), with:
  - A database (default name: `TaskApp`)
  - A container (default name: `Tasks`) partitioned by `/organizationId`
  - A container (default name: `FormSettings`) partitioned by `/organizationId`, storing one document per organization with that org's custom task-form field configuration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the local settings template and fill in your own values:
   ```bash
   cp local.settings.json.example local.settings.json
   ```
   Set `COSMOS_CONNECTION_STRING` to your Cosmos DB (or emulator) connection string. `local.settings.json` is git-ignored and must never be committed.

## Running locally

```bash
npm start
```

This runs `npm run prestart` (clean + build) and then `func start`, serving the API at `http://localhost:7071/api`.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `COSMOS_CONNECTION_STRING` | Yes | — | Cosmos DB account connection string |
| `COSMOS_DATABASE_NAME` | No | `TaskApp` | Cosmos DB database name |
| `COSMOS_TASKS_CONTAINER` | No | `Tasks` | Cosmos DB container name for tasks |
| `COSMOS_FORM_SETTINGS_CONTAINER` | No | `FormSettings` | Cosmos DB container name for form settings |

## API endpoints

All routes are prefixed with `/api`. `organizationId` is currently passed as a query parameter on every request as a placeholder for real authentication — see "Known limitations" below.

| Method | Route | Description |
|---|---|---|
| GET | `/tasks?organizationId=...&search=&status=&priority=&page=&pageSize=` | List tasks (paginated, filterable, searchable) |
| GET | `/tasks/{id}?organizationId=...` | Get a single task |
| POST | `/tasks?organizationId=...` | Create a task |
| PATCH | `/tasks/{id}?organizationId=...` | Partially update a task |
| DELETE | `/tasks/{id}?organizationId=...` | Delete a task |
| POST | `/tasks/bulk-delete?organizationId=...` (body: `string[]` of ids) | Delete multiple tasks |
| GET | `/form-settings?organizationId=...` | Get the organization's custom task-form field configuration (returns an empty `fields` array if none has been saved yet) |
| PUT | `/form-settings?organizationId=...` | Replace the organization's custom task-form field configuration |

### Form settings shape

`fields` is an array of custom fields appended to the end of the base Part 1 task form. Each field has:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (uuid) | Server-assigned; omit when adding a new field, include (unchanged) when renaming/repositioning an existing one so values already stored against it stay linked |
| `label` | `string` | Renameable display label |
| `type` | `"text" \| "date" \| "datetime" \| "email"` | Input type |
| `row` | `number` | Zero-based row position (unlimited rows) |
| `column` | `1 \| 2` | Column within the row (up to 2 columns) |

Example `PUT /form-settings?organizationId=...` body:

```json
{
  "fields": [
    { "label": "Client email", "type": "email", "row": 0, "column": 1 },
    { "label": "Follow-up date", "type": "date", "row": 0, "column": 2 }
  ]
}
```

## Build

```bash
npm run build
```

## Known limitations / next steps

- **Authentication**: endpoints currently require an Azure Functions key (`authLevel: 'function'`) but do not yet authenticate the caller against `organizationId`. A real auth solution (e.g. Azure AD / Easy Auth) is needed before this is production-ready.
- **Form settings validation**: field position collisions (two fields sharing the same `row`/`column`) are rejected, but the service does not currently enforce that rows are gapless/contiguous — the client is responsible for sending a sensible layout.
- **Cosmos internal fields**: `_rid`, `_self`, `_etag`, `_attachments`, `_ts` are still returned as-is in API responses; stripping them in the service/repository layer is a good follow-up for cleanliness.

## Security notes

- Cosmos DB credentials are loaded from environment variables; do not commit `local.settings.json`.
- Task list queries use Cosmos DB query parameters rather than string concatenation.
- `id` and `organizationId` are server-controlled and cannot be supplied through create/update request bodies.
- Request payloads are validated against the JSON schema with AJV.
- `organizationId` query parameters are validated as UUIDs.
- HTTP handlers use a centralized error wrapper so unexpected internal errors are not returned to clients.
- Function endpoints use `authLevel: "function"` as the current minimum protection. Production deployment should add real user authentication/authorization and derive organization identity from authenticated claims.

## Local verification checklist

After installing dependencies, verify the project with:

```bash
npm ci
npm run build
npm start
```

Then test the endpoints with a valid UUID `organizationId` and confirm:

- invalid/missing `organizationId` returns `400`;
- create rejects `id` and `organizationId` in the request body;
- update rejects `id` and `organizationId` in the request body;
- update can add/replace optional fields;
- search, status/priority filtering, and pagination work together;
- deleting a task from another organization returns `404`;
- malformed JSON returns `400`;
- unexpected server errors return a generic `500` response;
- `GET /form-settings` with no saved settings returns `200` with an empty `fields` array;
- `PUT /form-settings` rejects `id`/`organizationId` in the body, rejects fields missing `label`/`type`/`row`/`column`, and rejects two fields sharing the same `row`+`column`;
- `PUT /form-settings` saved fields round-trip correctly on the next `GET`.
