# Backend API - Task Manager (Azure Functions)

REST API backend for the Task Manager application, built with Node.js, TypeScript, Azure Functions, and Azure Cosmos DB.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) (Local Azure Storage Emulator)

Install Azure Functions Core Tools and Azurite globally:

```bash
npm install -g azure-functions-core-tools@4
npm install -g azurite
```

## Local Setup & Configuration

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `local.settings.json`

Create a file named `local.settings.json` in the project root with the following configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOSDB_CONNECTION_STRING": "AccountEndpoint=https://<your-account>.documents.azure.com:443/;AccountKey=<your-key>;"
  },
  "Host": {
    "CORS": "*"
  }
}
```

**Configuration Details:**

| Key | Description |
|-----|-------------|
| `AzureWebJobsStorage` | Set to `"UseDevelopmentStorage=true"` to use Azurite as the local storage emulator |
| `FUNCTIONS_WORKER_RUNTIME` | Set to `"node"` for Node.js runtime |
| `COSMOSDB_CONNECTION_STRING` | Your Azure Cosmos DB connection string (format: `AccountEndpoint=https://<account>.documents.azure.com:443/;AccountKey=<key>;`) |
| `Host.CORS` | Set to `"*"` to allow all origins during development. For production, restrict to your frontend domain. |

> **Note:** Never commit `local.settings.json` to version control. It is already included in `.gitignore`.

## Running the App

### 1. Start Azurite

Open a terminal and start the local storage emulator:

```bash
azurite
```

Keep this terminal running in the background.

### 2. Start the Azure Functions Server

Open a **new terminal** and run:

```bash
npm start
```

This command will:
1. Clean the `dist/` folder
2. Compile TypeScript to JavaScript
3. Start the Azure Functions runtime on **port 7071**

The server is ready when you see:

```
Functions:
    GetTasks: [GET] http://localhost:7071/api/GetTasks
    GetTask: [GET] http://localhost:7071/api/GetTask
    InsertTask: [POST] http://localhost:7071/api/InsertTask
    UpdateTask: [POST] http://localhost:7071/api/UpdateTask
    DeleteTask: [DELETE] http://localhost:7071/api/DeleteTask
    BulkDeleteTasks: [POST] http://localhost:7071/api/BulkDeleteTasks
    GetFormSettings: [GET] http://localhost:7071/api/GetFormSettings
    SaveFormSettings: [POST] http://localhost:7071/api/SaveFormSettings
```

## Available API Endpoints

### Tasks

| Method | Endpoint | Description | Request Body / Query |
|--------|----------|-------------|----------------------|
| GET | `/api/GetTasks` | List all tasks | Query: `?organizationId=<id>` (optional) |
| GET | `/api/GetTask` | Get a single task | Query: `?id=<taskId>&organizationId=<id>` |
| POST | `/api/InsertTask` | Create a new task | `{ title, status, description?, priority?, dueDate?, tags?, dynamicData? }` |
| POST | `/api/UpdateTask` | Update an existing task | Query: `?id=<taskId>`, Body: `{ title?, status?, description?, priority?, dueDate?, tags?, dynamicData? }` |
| DELETE | `/api/DeleteTask` | Delete a task | Query: `?id=<taskId>` |
| POST | `/api/BulkDeleteTasks` | Delete multiple tasks | `{ taskIds: string[] }` |

### Form Settings

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/GetFormSettings` | Get form builder configuration | — |
| POST | `/api/SaveFormSettings` | Save form builder configuration | `{ organizationId, fields: FormFieldConfig[] }` |

### Task Schema

```typescript
{
  id: string;                    // Auto-generated UUID
  organizationId: string;        // Defaults to "org-default"
  title: string;                 // Required
  description?: string;
  status: "todo" | "in-progress" | "completed";  // Required
  priority?: "low" | "medium" | "high";           // Defaults to "medium"
  dueDate?: string;              // ISO date string
  tags?: string[];
  dynamicData?: Record<string, any>;  // Custom field values
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # Cosmos DB client setup
│   │   └── constants.ts        # Application constants
│   ├── functions/
│   │   ├── tasks/              # Task CRUD functions
│   │   │   ├── GetTasks.ts
│   │   │   ├── GetTask.ts
│   │   │   ├── InsertTask.ts
│   │   │   ├── UpdateTask.ts
│   │   │   ├── DeleteTask.ts
│   │   │   └── BulkDeleteTasks.ts
│   │   └── settings/           # Form builder config functions
│   │       ├── GetFormSettings.ts
│   │       └── SaveFormSettings.ts
│   ├── middleware/
│   │   └── errorHandler.ts     # Error handling wrapper
│   ├── types/
│   │   ├── task.ts             # Task type definitions
│   │   └── formConfig.ts       # Form config type definitions
│   └── utils/
│       ├── response.ts         # HTTP response helpers
│       └── validators.ts       # Input validation utilities
├── host.json                   # Azure Functions host configuration
├── local.settings.json         # Local development settings (not committed)
├── package.json
└── tsconfig.json
```

## License

This project was created as a technical test for Kitameraki.
