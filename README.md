# Kitameraki Backend

## Local setup

Install Node.js 20+, Azure Functions Core Tools, Docker, and the npm dependencies:

```bash
npm install
```

Start the Cosmos DB emulator:

```bash
docker run --name cosmos-emulator \
  -p 8081:8081 -p 10250:10250 -p 10251:10251 \
  -p 10252:10252 -p 10253:10253 -p 10254:10254 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
```

Copy the environment template, initialize the database, and start the Functions host:

```bash
cp local.settings.example.json local.settings.json
npm run db:init
npm start
```

`npm run db:init` creates the `TaskApp` database, `Tasks` and `FormSettings` containers when needed, with partition key `/organizationId` and the composite index required by task list ordering.

The API is available under `http://localhost:7071/api/tasks`. The example uses the Cosmos DB emulator connection string.

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS certificate validation for the emulator's self-signed certificate. Use it only for local development and never in Azure or production.

`AzureWebJobsStorage` is intentionally empty because this Functions app only uses HTTP triggers, so Azurite is not required.

Core Tools may still log `Unhealthy: Unable to create client for AzureWebJobsStorage`; with an empty storage setting in this HTTP-only app, the warning is harmless and can be ignored locally.

## API

All task endpoints require an `organizationId` query parameter. Form settings use the same parameter.

| Method | Route                    | Success |
| ------ | ------------------------ | ------- |
| GET    | `/api/tasks`             | `200`   |
| GET    | `/api/tasks/{id}`        | `200`   |
| POST   | `/api/tasks`             | `201`   |
| PATCH  | `/api/tasks/{id}`        | `200`   |
| DELETE | `/api/tasks/{id}`        | `204`   |
| POST   | `/api/tasks/bulk-delete` | `204`   |
| GET    | `/api/form-settings`     | `200`   |
| PUT    | `/api/form-settings`     | `200`   |

### Create a task

```bash
curl -X POST http://localhost:7071/api/tasks \
  -H 'content-type: application/json' \
  -d '{
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "title": "Prepare report",
    "status": "todo",
    "priority": "high"
  }'
```

### List, search, filter, and paginate

```bash
curl 'http://localhost:7071/api/tasks?organizationId=11111111-1111-4111-8111-111111111111&search=report&status=todo&page=1&pageSize=20'
```

The response is:

```json
{
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
}
```

`pageSize` must be between 1 and 100. Empty `search`, `status`, and `priority` query values are treated as unset.

### Update custom fields

`PATCH /api/tasks/{id}` merges `customFields` into the stored map. A `null` value removes one key:

```json
{
    "customFields": {
        "customer-email": "user@example.com",
        "notes": null
    }
}
```

Custom field updates use the task ETag. A concurrent update returns `409 CONFLICT`; clients should reload the task and inform the user.

### Form settings

`GET /api/form-settings` returns the six default built-in fields until settings are saved. `PUT` accepts `{ "fields": [...], "rows": [...] }`. Field IDs are stable, limited to 50 alphanumeric, underscore, or hyphen characters, and built-in field types cannot change.

## Errors

All errors use one response shape:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid request.",
        "details": {}
    }
}
```

`details` is present for validation errors. Error codes include `VALIDATION_ERROR`, `INVALID_JSON`, `NOT_FOUND`, `CONFLICT`, and `INTERNAL_ERROR`.

## Tests and quality checks

```bash
npm test
npm run lint
npm run format:check
```

Initialize the database first, then start the Functions host:

```bash
npm run db:init
npm start
```

With the host and Cosmos emulator running, execute the integration suite from another terminal:

```bash
npm run test:integration
```

## Known limitations

- There is no authentication yet. `organizationId` is supplied by the client, so this API is vulnerable to IDOR until Entra ID, Easy Auth, or another trusted identity source is added.
- A deleted custom field ID must not be reused with another type. Front-end code should generate a new UUID with `crypto.randomUUID()` for every new custom field.
- Built-in fields are rendered by their IDs. `priority` and `status` need dropdowns, `tags` needs a tag input, and `description` needs a textarea even though their settings type is `text`.
