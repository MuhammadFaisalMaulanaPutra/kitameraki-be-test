# Task Management Backend API

Backend service for the Task Management Application built with Azure Functions v4 (Node.js / TypeScript) and Azure Cosmos DB.

---

## Prerequisites

- **Node.js**: v18 or v20
- **Azure Functions Core Tools v4**:
  ```bash
  npm install -g azure-functions-core-tools@4 --unsafe-perm true
  ```
- **Azure Cosmos DB**: An active Cosmos DB account connection string (or local Cosmos DB Emulator).
  - Database Name: `TaskApp`
  - Container Name: `Tasks`
  - Partition Key: `/organizationId`

---

## Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Settings
Copy the example settings file:
```bash
cp local.settings.json.example local.settings.json
```
*(On Windows PowerShell: `Copy-Item local.settings.json.example local.settings.json`)*

Open `local.settings.json` and set your `COSMOS_CONNECTION_STRING`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://<your-account>.documents.azure.com:443/;AccountKey=<your-key>;",
    "COSMOS_DATABASE_NAME": "TaskApp",
    "COSMOS_CONTAINER_NAME": "Tasks"
  },
  "Host": {
    "CORS": "*"
  }
}
```

> **Note for Local Cosmos DB Emulator:**  
> If using the local emulator on Windows, add `"NODE_TLS_REJECT_UNAUTHORIZED": "0"` inside `Values` to allow the emulator's local self-signed TLS certificate.

---

## Running the Application

### 1. (Optional) Seed Sample Tasks
Populate the database with 20 realistic tasks covering different statuses, priorities, due dates, and tags:
```bash
npm run seed
```
> Default seed `organizationId`: `d3b07384-d113-46c1-a9c1-236b28900a01`

### 2. Start Local Server
```bash
npm start
```
The local server will start at `http://localhost:7071`.

---

## Testing

Run unit tests via Vitest:
```bash
npm test
```

---

## API Endpoints

Base URL: `http://localhost:7071/api`

### Task Endpoints (Part 1)
| Method | Endpoint | Query Parameters | Body | Description |
|---|---|---|---|---|
| `GET` | `/HealthCheck` | - | - | Server and Cosmos DB connection health check |
| `GET` | `/GetTasks` | `organizationId` (required), `search`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `pageSize` | - | Paginated task list with search & filter |
| `GET` | `/GetTask` | `id`, `organizationId` | - | Retrieve single task details |
| `POST` | `/InsertTask` | - | JSON Task DTO (`title`, `status`, `customFields`, etc.) | Create task (Returns 201) |
| `PATCH` | `/UpdateTask` | `id`, `organizationId` | JSON Partial Task DTO | Update task fields (Patch API) |
| `DELETE` | `/DeleteTask` | `id`, `organizationId` | - | Delete single task |
| `DELETE` | `/BulkDeleteTasks` | `organizationId` | `string[]` (UUIDs) | Delete multiple tasks in parallel |

### Form Settings Endpoints (Part 2)
| Method | Endpoint | Query Parameters | Body | Description |
|---|---|---|---|---|
| `GET` | `/GetFormSettings` | `organizationId` (required) | - | Retrieve saved dynamic form fields configuration |
| `POST` | `/SaveFormSettings` | - | JSON `{ organizationId, fields: FormFieldSetting[] }` | Save / upsert dynamic form fields layout (supports up to 2 columns, text/date/datetime/email) |