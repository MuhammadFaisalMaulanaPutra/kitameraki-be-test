# Kitameraki Task API

Azure Functions (Node.js/TypeScript) HTTP API backing the Kitameraki Task Management App, backed by Azure Cosmos DB.

## Running locally

Prerequisites:

- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- An Azure Cosmos DB account (or the [Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/emulator))

Steps:

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `local.settings.json.example` to `local.settings.json` and fill in `COSMOS_DB_CONNECTION_STRING` with your Cosmos DB account's connection string.
   ```
   cp local.settings.json.example local.settings.json
   ```
3. Start the function host:
   ```
   npm start
   ```
   This builds the TypeScript sources and runs `func start`, serving the API at `http://localhost:7071/api`.

The `Tasks` and `FormSettings` containers (database `TaskApp`) are created automatically on first use if they don't already exist, so no manual Cosmos DB setup beyond the connection string is required.

## Authentication

All endpoints use `authLevel: function`. Requests must include the function key, either as `?code=<key>` or the `x-functions-key` header. When running locally, the Core Tools print the key on startup (or use the "master" key shown in the Core Tools output).

## API

All endpoints require a `organizationId` (UUID) query parameter that scopes the request.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/GetTasks?organizationId=` | List all tasks for the organization |
| GET | `/api/GetTask?organizationId=&id=` | Get a single task |
| POST | `/api/InsertTask?` | Create a task (task fields, including `organizationId`, in the body) |
| POST | `/api/UpdateTask?organizationId=&id=` | Partially update a task (changed fields in the body) |
| DELETE | `/api/DeleteTask?organizationId=&id=` | Delete a task |
| DELETE | `/api/BulkDeleteTasks?organizationId=` | Delete multiple tasks (array of task id strings in the body, max 100) |
| GET | `/api/form-settings?organizationId=` | Get the task form's field configuration (returns sensible defaults if none has been saved yet) |
| PUT | `/api/form-settings?organizationId=` | Replace the task form's field configuration |

### Task shape

See [task.schema.json](./task.schema.json). Values for fields added through the settings page are stored in `customFields`, keyed by the field's `key` (e.g. `customFields["customFields.department"]`).

### Form settings shape

```ts
interface FormSettings {
  id: string;            // == organizationId
  organizationId: string;
  fields: FormFieldConfig[];
}

interface FormFieldConfig {
  id: string;
  key: string;            // Task property this field reads/writes
  label: string;
  type: "text" | "textarea" | "select" | "date" | "datetime" | "email" | "tags";
  width: "half" | "full";
  isCustom: boolean;
  required?: boolean;
  options?: string[];     // for "select" fields
}
```

The built-in fields (`title`, `description`, `dueDate`, `priority`, `status`, `tags`) must always be present in a `PUT` request; custom fields can be freely added, renamed, reordered, resized, or removed.
