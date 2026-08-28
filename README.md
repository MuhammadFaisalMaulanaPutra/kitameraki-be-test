# Kita Meraki Backend Technical Test

Azure Functions + TypeScript backend for the Task Management technical test.

This refactor keeps the original Azure Functions/Cosmos DB direction while separating HTTP handling, business rules, validation, and persistence. It also adds form-settings persistence required by Part 2 of the assignment.

## Architecture

```text
Azure Function handler
        |
        v
Service / business rules
        |
        v
Repository contract
     /       \
    v         v
JSON local   Azure Cosmos DB
```

Key boundaries:

- `src/functions`: HTTP routes only; no database logic.
- `src/services`: task/form workflows and business rules.
- `src/validation`: untrusted input validation and normalization.
- `src/repositories`: persistence contracts and implementations.
- `src/domain`: explicit application data types.
- `src/http`: consistent success/error responses and request helpers.
- `src/config`: environment configuration.

## Requirements

- Node.js 20 or newer.
- npm.
- Azure Functions Core Tools v4 to run the Function App locally.
- Azurite if `AzureWebJobsStorage=UseDevelopmentStorage=true` is used.
- Azure Cosmos DB only when using the `cosmos` storage provider.

## Install

```bash
npm ci
```

## Local development without Cosmos DB

The local JSON repository is useful for development and manual acceptance testing. Production should use Cosmos DB.

1. Copy the example settings file:

```bash
cp local.settings.json.example local.settings.json
```

On Windows PowerShell:

```powershell
Copy-Item local.settings.json.example local.settings.json
```

2. Keep these values for local JSON storage:

```json
{
  "STORAGE_PROVIDER": "json",
  "LOCAL_DATA_DIRECTORY": ".data",
  "DEFAULT_ORGANIZATION_ID": "org-local"
}
```

3. Start Azurite if your local Azure Functions runtime requires `UseDevelopmentStorage=true`.

4. Run the Function App:

```bash
npm start
```

The default base URL is:

```text
http://localhost:7071/api
```

Local JSON files are written to `.data/` and are ignored by Git.

## Cosmos DB configuration

For Cosmos DB, set:

```text
STORAGE_PROVIDER=cosmos
COSMOS_CONNECTION_STRING=<secret connection string>
COSMOS_DATABASE_NAME=TaskApp
COSMOS_TASKS_CONTAINER_NAME=Tasks
COSMOS_FORM_SETTINGS_CONTAINER_NAME=FormSettings
DEFAULT_ORGANIZATION_ID=<single workspace id, recommended until authentication exists>
```

Required containers:

| Container | Partition key |
| --- | --- |
| `Tasks` | `/organizationId` |
| `FormSettings` | `/organizationId` |

Do not commit `local.settings.json` or a Cosmos DB connection string. In Azure, store these values in Function App configuration/application settings (or a secret-management integration).

## API

All responses use a predictable envelope.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Validation failure:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "title is required."
    }
  ]
}
```

Unexpected internal errors return a generic message and do not expose stack traces to API clients.

### Tasks

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/tasks` | Search/filter/sort/paginate tasks |
| `GET` | `/api/tasks/summary` | Task summary counts |
| `GET` | `/api/tasks/{id}` | Get one task |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/{id}` | Partially update a task |
| `POST` | `/api/tasks/{id}` | Compatibility method for update |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `DELETE` | `/api/tasks/bulk` | Delete up to 100 tasks |

Task list query parameters:

- `search`: case-insensitive title/description search.
- `status`: `todo`, `in-progress`, or `completed`.
- `priority`: `low`, `medium`, or `high`.
- `tags`: comma-separated exact tag filters.
- `pageSize`: integer from 1 to 100; default 20.
- `pageToken`: opaque token returned by the previous page.
- `sortBy`: `title`, `dueDate`, `priority`, `status`, `createdAt`, or `updatedAt`.
- `sortDirection`: `asc` or `desc`.

If `DEFAULT_ORGANIZATION_ID` is not configured, pass `organizationId` as a query parameter. `POST /tasks` also accepts it in the create body for backward compatibility.

Example create body:

```json
{
  "title": "Prepare proposal",
  "description": "Client proposal",
  "priority": "high",
  "status": "todo",
  "tags": ["sales"],
  "customFields": {
    "customer_email": "client@example.com"
  }
}
```

`id`, `createdAt`, `updatedAt`, and the effective `organizationId` are controlled by the backend.

Status transitions follow the project business rules:

```text
todo -> in-progress
in-progress -> todo | completed
completed -> in-progress
```

Bulk delete body:

```json
{
  "ids": ["task-id-1", "task-id-2"]
}
```

### Form settings

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/form-settings` | Get active form configuration |
| `PUT` | `/api/form-settings` | Validate and save form configuration |

The API returns a default configuration for the system fields when no configuration has been saved yet.

Supported custom field types:

- `text`
- `date`
- `datetime`
- `email`

Validation protects these invariants:

- Stable, unique field ids/keys.
- Existing custom field types cannot be changed in place; rename/reorder is safe, while a type migration requires a new field id.
- Required system fields cannot be removed.
- `title` and `status` remain required.
- System field keys/types are immutable; labels/layout may change.
- Maximum two columns (`1` or `2`) with no fixed row-count limit.
- No duplicate row/column positions.
- Custom task values must exist in the active configuration and match their configured type.
- Removed custom fields are hidden from active validation but historical values on existing tasks are not automatically destroyed.

## Build and tests

```bash
npm test
```

This performs a clean TypeScript build and runs Node's built-in test runner.

Build only:

```bash
npm run build
```

Current automated coverage focuses on high-risk behavior rather than coverage percentage:

- Input/mass-assignment validation.
- Form-settings invariants.
- Task status transitions.
- Dynamic custom-field validation.
- Bulk deletion completion semantics.
- JSON repository filtering and pagination.

Cosmos DB behavior should also be smoke-tested against an emulator or development Cosmos account before deployment.

## Security notes

Authentication/authorization is not part of the supplied technical-test scope, so HTTP functions intentionally remain `anonymous`. This means `organizationId` is a data partition key, **not a security boundary**.

For a single-organization deployment, configure `DEFAULT_ORGANIZATION_ID`; server configuration takes precedence over client-supplied organization ids. A future multi-tenant version must derive organization ownership from authenticated identity instead of trusting a request parameter.

Other security improvements in this refactor include:

- No connection strings in source code.
- Parameterized Cosmos SQL queries.
- Strict allowlists for sort fields and updateable properties.
- Server-managed identity/timestamps.
- Explicit body/query validation and bounded destructive/tag batch inputs.
- Consistent sanitized API errors.
- No request bodies, tokens, or secrets written to application logs.
- Repository abstraction prevents business logic from depending directly on Cosmos DB.
