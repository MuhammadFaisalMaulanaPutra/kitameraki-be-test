# kitameraki-be-test

Azure Functions backend for the Task Management app, backed by Azure Cosmos DB.

## Prerequisites

- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools)
- An Azure Cosmos DB account (or the local emulator)

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the Cosmos DB emulator**

   ```bash
   docker compose up -d
   ```

   This starts the Cosmos DB emulator at `https://localhost:8081`. The `local.settings.json` is already pre-configured with the emulator endpoint and well-known key — no changes needed.

   Once running, the Data Explorer is available at `https://localhost:8081/_explorer/index.html`.

   > **Note:** The emulator uses a self-signed TLS certificate. The app automatically disables TLS verification when the endpoint is `localhost`.

3. **Create the database and containers**

   In the Data Explorer (`https://localhost:8081/_explorer/index.html`), create:
   - Database: `TaskApp`
   - Container: `Tasks` — partition key `/organizationId`
   - Container: `FormSettings` — partition key `/organizationId`

4. **Start the app**
   ```bash
   npm start
   ```
   This cleans, builds TypeScript, then runs `func start`. The API will be available at `http://localhost:7071`.

## API Endpoints

All endpoints accept `organizationId` as a required query parameter.

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/GetTasks` | List tasks (paginated, filterable) |
| GET | `/api/GetTask` | Get single task by `id` |
| POST | `/api/InsertTask` | Create a task |
| POST | `/api/UpdateTask` | Update task fields by `id` |
| POST | `/api/UpdateTaskStatus` | Update only the status by `id` |
| DELETE | `/api/DeleteTask` | Soft-delete a task by `id` |
| DELETE | `/api/BulkDeleteTasks` | Soft-delete multiple tasks (body: `["id1","id2"]`) |

#### GetTasks query parameters

| Param | Default | Description |
|-------|---------|-------------|
| `organizationId` | required | — |
| `pageNumber` | 1 | — |
| `pageSize` | 10 (max 100) | — |
| `status` | — | 0=NOT_STARTED, 1=IN_PROGRESS, 2=COMPLETED, 3=CANCELLED |
| `searchTerm` | — | Searches name and description |
| `sortBy` | `createdAt` | `createdAt`, `updatedAt`, `name`, `status` |
| `sortOrder` | `DESC` | `ASC` or `DESC` |

### Form Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/GetFormSettings` | Get form config for an organization |
| POST/PUT | `/api/UpsertFormSettings` | Save form config |

#### UpsertFormSettings body

```json
{
  "fields": [
    {
      "id": "field-1",
      "label": "Due Date",
      "type": "date",
      "required": false,
      "column": 0,
      "order": 0
    }
  ]
}
```

Field types: `text`, `date`, `datetime`, `email`

## Project Structure

```
src/
  functions/       # Azure Function handlers (thin — validate, call service, return)
  services/        # Cosmos DB data access (taskService, formSettingsService)
  validators/      # Input validation (taskValidator, formSettingsValidator)
  interfaces/      # TypeScript types (task, formSettings)
  libs/            # Shared utilities (cosmosClient singleton, response helpers)
```
