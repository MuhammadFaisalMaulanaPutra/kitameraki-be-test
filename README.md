# Kitameraki Task App - Backend

Azure Functions backend with file-based JSON database (simulating Cosmos DB structure).

## Prerequisites

- Node.js 18+
- Azure Functions Core Tools (`npm install -g azure-functions-core-tools@4`)
- TypeScript

## Installation

```bash
npm install
```

## Running Locally

```bash
npm start
```

This will:

1. Clean the `dist/` folder
2. Compile TypeScript
3. Start the Azure Functions runtime

The API will be available at `http://127.0.0.1:7071/api`

## API Endpoints

| Method | Endpoint                                   | Description          |
| ------ | ------------------------------------------ | -------------------- |
| GET    | `/api/GetTasks?organizationId=org1`        | List all tasks       |
| GET    | `/api/GetTask?id={id}`                     | Get single task      |
| POST   | `/api/InsertTask`                          | Create new task      |
| POST   | `/api/UpdateTask`                          | Update existing task |
| DELETE | `/api/DeleteTask?id={id}`                  | Delete task          |
| DELETE | `/api/BulkDeleteTasks`                     | Bulk delete tasks    |
| GET    | `/api/GetFormSettings?organizationId=org1` | Get form settings    |
| POST   | `/api/SaveFormSettings`                    | Save form settings   |

## CORS

CORS is configured to allow all origins (`*`) for local development.

## Database

Data is stored in `db.json` (file-based JSON database). Default settings and sample tasks are pre-seeded.
