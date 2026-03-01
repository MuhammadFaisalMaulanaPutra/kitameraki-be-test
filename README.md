# Kitameraki Task Management Backend

A serverless Azure Functions backend built with Node.js and TypeScript, backed by **Azure Cosmos DB** (NoSQL API). This service provides the core data persistence and business logic for the Kitameraki Task Management application.

## Architecture & Features

- **Serverless:** Built on Azure Functions v4 using the updated Node.js programming model (TypeScript).
- **Multi-Tenant Design:** Tasks and Form Settings are implicitly isolated using the `organizationId` acting as the logical partition key in Cosmos DB.
- **Concurrency Control:** Bulk operations (like `BulkDeleteTasks`) implement internal concurrency limits to manage Request Unit (RU) consumption effectively.
- **Security & Validation:**
  - Content mapping validation to prevent payload bloat.
  - Required endpoint parameters (e.g., `organizationId`) ensure explicit logical separation.
  - Graceful backend error masking (Node.js stack traces are stripped before being returned to the client).

## Available Endpoints

All endpoints are hosted under the `/api` route prefix.

*   `GET /api/GetTasks` - Retrieve paginated and filtered tasks.
*   `GET /api/GetTask` - Retrieve a single task by ID.
*   `POST /api/InsertTask` - Create a new task.
*   `POST /api/UpdateTask` - Update an existing task.
*   `DELETE /api/DeleteTask` - Delete a single task.
*   `DELETE /api/BulkDeleteTasks` - Delete up to 100 tasks efficiently at once.
*   `GET /api/GetFormSettings` - Retrieve dynamically configured layout fields for the task forms.
*   `POST /api/UpdateFormSettings` - Save a new dynamic form layout configuration.

## Setup & Local Development

### Prerequisites
- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) (`npm i -g azure-functions-core-tools@4 --unsafe-perm true`)
- [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator) running locally contextually, OR a live Cosmos DB connection string.

### Configuration

Create a `local.settings.json` file in the root directory:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_ENDPOINT": "https://localhost:8081/",
    "COSMOS_DB_KEY": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DB_NAME": "TaskApp",
    "COSMOS_CONTAINER_NAME": "Tasks"
  }
}
```

> **Note:** The `COSMOS_DB_KEY` above is the standard well-known key for the local Cosmos DB Emulator. Trust the Emulator's self-signed certificate on your OS, and optionally run with `NODE_OPTIONS=--use-system-ca`.

### Running the API

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the TypeScript source:
   ```bash
   npm run build
   ```
3. Start the functions host:
   ```bash
   func start
   ```

By default, the backend will listen on `http://localhost:7071`.
