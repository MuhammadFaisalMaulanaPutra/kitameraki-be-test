# Task Management App - Backend

This repository contains the backend infrastructure for the Task Management App. It is built using Azure Functions (Serverless) and utilizes Azure Cosmos DB (NoSQL) for scalable data storage.

## Tech Stack
- **Framework:** Azure Functions (Node.js runtime v4)
- **Language:** TypeScript
- **Database:** Azure Cosmos DB

## Database & Environment Setup

Before running the application, you must set up the database and configure your environment variables. Create a `local.settings.json` file in the root directory (this file is git-ignored) and choose **one** of the setup options below.

### Option A: Using Azure Cosmos DB (Cloud)
1. Log in to the [Azure Portal](https://portal.azure.com/) and navigate to your Cosmos DB account.
2. In the **Data Explorer**, create a new Database named `TaskApp`.
3. Create a new Container named `Tasks` with `/organizationId` as the Partition Key.
4. Copy your **Primary Connection String** from the **Keys** blade.
5. Add the following to your `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "<YOUR_AZURE_COSMOS_DB_CONNECTION_STRING>",
    "COSMOS_DATABASE_ID": "TaskApp",
    "COSMOS_CONTAINER_ID": "Tasks"
  },
  "Host": {
    "CORS": "*"
  }
}
```

### Option B: Using Azure Cosmos DB Emulator (Local)
1. Start the Azure Cosmos DB Emulator.
2. Open the Data Explorer (`https://localhost:8081/_explorer/index.html`).
3. Create a new Database named `TaskApp`.
4. Create a new Container named `Tasks` with `/organizationId` as the Partition Key.
5. Add the following to your local.settings.json.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DATABASE_ID": "TaskApp",
    "COSMOS_CONTAINER_ID": "Tasks",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": {
    "CORS": "*"
  }
}
```

## Running the App Locally
1. Clone the repository and navigate to the root folder.
2. Install the dependencies:
```bash
npm install
```
3. Start the functions locally using npm:
```bash
npm start
```
4. The API will be available at `http://localhost:7071/api/`

### API Endpoints

**Task Management**
- `GET /api/GetTasks?organizationId={id}`
- `GET /api/GetTask?id={id}&organizationId={orgId}`
- `POST /api/InsertTask`
- `PATCH /api/UpdateTask?id={id}&organizationId={orgId}`
- `DELETE /api/DeleteTask?id={id}&organizationId={orgId}`
- `DELETE /api/BulkDeleteTasks?organizationId={orgId}`

**Form Settings (Dynamic Form Builder)**
- `GET /api/GetFormSettings?organizationId={id}`
- `PUT /api/UpdateFormSettings?organizationId={orgId}`