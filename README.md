# Kitameraki Task Management API

Backend service for the Kitameraki Task Management App, built on Azure Functions (Node.js/TypeScript) with Azure Cosmos DB as the data store.

Submitted by: Haryo Prastiko

## Tech Stack

- Azure Functions v4 (Node.js, TypeScript)
- Azure Cosmos DB (SQL API)
- Zod for request validation

## Prerequisites

- Node.js 20.x
- Azure Functions Core Tools v4
- Azure Cosmos DB Emulator (Windows) or a Cosmos DB account

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Cosmos DB

Install and run the [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator). Once running, open the Data Explorer at `https://localhost:8081/_explorer/index.html` and create:

- Database: `TaskApp`
- Container: `Tasks`, partition key `/organizationId`
- Container: `FormSettings`, partition key `/organizationId`

### 3. Configure environment variables

Create `local.settings.json` in the project root:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;",
    "COSMOS_DB_NAME": "TaskApp",
    "COSMOS_TASKS_CONTAINER": "Tasks",
    "COSMOS_FORM_SETTINGS_CONTAINER": "FormSettings",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": {
    "CORS": "http://localhost:5173",
    "CORSCredentials": false
  }
}
```

The connection string above is the Cosmos DB Emulator's fixed default key and is safe to use for local development only. `NODE_TLS_REJECT_UNAUTHORIZED` disables TLS certificate validation, required because the emulator uses a self-signed certificate; this variable must not be set in any deployed environment. Adjust `Host.CORS` if your frontend runs on a different port.

### 4. Run the app

```bash
npm start
```

The API will be available at `http://localhost:7071/api`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/GetTasks?organizationId={id}` | List all tasks for an organization |
| GET | `/api/GetTask?id={id}&organizationId={id}` | Get a single task |
| POST | `/api/InsertTask` | Create a task |
| PATCH | `/api/UpdateTask?id={id}&organizationId={id}` | Update a task |
| DELETE | `/api/DeleteTask?id={id}&organizationId={id}` | Delete a task |
| DELETE | `/api/BulkDeleteTasks?organizationId={id}` | Delete multiple tasks |
| GET | `/api/GetFormSettings?organizationId={id}` | Get custom form field settings |
| PUT | `/api/UpdateFormSettings?organizationId={id}` | Update custom form field settings |

## Project Structure

```
src/
  config/       Environment variable access
  services/     Cosmos DB client (singleton)
  schemas/      Zod validation schemas
  functions/    Azure Function endpoints
```

## Security Notes

- All Cosmos DB access is routed through a shared client instance rather than being instantiated per request.
- Query filters use parameterized values to prevent SQL injection.
- All write endpoints validate request bodies against a schema before touching the database.
- No credentials are hardcoded; all secrets are read from environment configuration.
