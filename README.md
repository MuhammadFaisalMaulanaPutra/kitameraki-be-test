# Task Management API — Backend

Azure Functions v4 (Node.js) + Azure Cosmos DB + TypeScript

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.x | Runtime |
| npm | ≥ 9.x | Package management |
| Azure Functions Core Tools | v4.x | Local function host |
| Azure Cosmos DB Emulator | Latest | Local database |

Install Azure Functions Core Tools:
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd kitameraki-be-test
npm install
```

### 2. Start the Cosmos DB Emulator

Download and start the [Azure Cosmos DB Emulator](https://aka.ms/cosmosdb-emulator).

Once running, open the Data Explorer at `https://localhost:8081/_explorer/index.html` and create:

- **Database:** `TaskManagementDB`
- **Container:** `Tasks`
  - Partition key: `/id`
  - Throughput: 400 RU/s (manual)

### 3. Configure local settings

The `local.settings.json` file is git-ignored. Create it at the project root:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://localhost:8081",
    "COSMOS_KEY": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "DATABASE_NAME": "TaskManagementDB",
    "COSMOS_CONTAINER_NAME": "Tasks",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

> **Note:** `NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS verification for the local emulator's self-signed certificate. **Never set this in a cloud environment.**

### 4. Start the API

```bash
npm start
```

This runs `clean → build → func start`. The API will be available at `http://localhost:7071`.

---

## API Reference

All routes are prefixed with `/api`.

### Tasks

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/tasks` | List tasks (paginated, filterable, searchable) |
| `GET` | `/api/tasks/{id}` | Get a single task by ID |
| `POST` | `/api/tasks` | Create a new task |
| `PATCH` | `/api/tasks/{id}` | Partially update a task |
| `DELETE` | `/api/tasks/{id}` | Delete a single task |
| `DELETE` | `/api/tasks/bulk` | Delete multiple tasks by ID |

### Settings

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/settings` | Get global form settings |
| `PUT` | `/api/settings` | Create or replace global form settings |

---

### GET /api/tasks — Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | 1-based page number |
| `pageSize` | number | `20` | Items per page (max 100) |
| `search` | string | — | Searches title and description (case-insensitive) |
| `status` | string | — | Filter: `todo` \| `in-progress` \| `completed` |
| `priority` | string | — | Filter: `low` \| `medium` \| `high` |
| `organizationId` | string | — | Filter by organisation ID |
| `tags` | string | — | Comma-separated tags (ANY match) |

**Response shape:**
```json
{
  "items": [ ...Task[] ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### POST /api/tasks — Request Body

```json
{
  "organizationId": "uuid",
  "title": "string (required, max 100)",
  "description": "string (optional, max 1000)",
  "status": "todo | in-progress | completed",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 date-time string",
  "tags": ["string"],
  "customFieldValues": { "fieldId": "value" }
}
```

> `id`, `createdAt`, and `updatedAt` are **server-assigned** and must not be included.

---

### PUT /api/settings — Request Body

```json
{
  "customFields": [
    {
      "fieldId": "uuid",
      "label": "Customer Email",
      "type": "email",
      "required": false,
      "order": 0
    }
  ]
}
```

Field `type` must be one of: `text` | `date` | `datetime` | `email`.

---

## Project Structure

```
├── src/
│   ├── functions/          # One file per HTTP function handler
│   │   ├── GetTasks.ts
│   │   ├── GetTask.ts
│   │   ├── InsertTask.ts
│   │   ├── UpdateTask.ts
│   │   ├── DeleteTask.ts
│   │   ├── BulkDeleteTasks.ts
│   │   ├── GetSettings.ts
│   │   └── UpsertSettings.ts
│   ├── lib/
│   │   └── cosmosClient.ts  # Singleton Cosmos DB client
│   ├── models/
│   │   └── models.ts        # Shared TypeScript interfaces & types
│   ├── utils/
│   │   ├── responseHelpers.ts  # Consistent HTTP response factories
│   │   └── validators.ts       # Input validation functions
│   └── index.ts             # App bootstrap
├── task.schema.json         # JSON Schema for Task document
├── host.json
├── package.json
└── tsconfig.json
```

---

## Key Design Decisions

- **Singleton Cosmos client** — The `CosmosClient` is instantiated once at module load time and shared across all warm invocations. Re-creating it per-request wastes TCP connections and adds latency.
- **Server-generated IDs** — Task IDs are generated server-side (UUID v4) to prevent clients from injecting crafted IDs that could collide with system documents.
- **Parameterised queries** — All Cosmos DB queries use parameterised SQL to prevent NoSQL injection.
- **Consistent error responses** — All handlers return a `{ code, message }` JSON envelope on failure, making client-side error handling predictable.
- **`strict: true`** — Full TypeScript strict mode eliminates an entire class of runtime errors at compile time.

---

## Error Response Format

All error responses share a consistent JSON shape:

```json
{
  "code": "VALIDATION_ERROR | NOT_FOUND | INTERNAL_SERVER_ERROR",
  "message": "Human-readable description",
  "details": {}
}
```
