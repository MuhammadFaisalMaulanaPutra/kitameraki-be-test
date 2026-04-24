# Kitameraki Task Management API

This project is a backend service built using:

* Azure Functions (Node.js + TypeScript)
* Azure Cosmos DB (SQL API)
* Local development with Cosmos Emulator

---

## Prerequisites

Make sure you have installed:

* Node.js (>= 18 recommended)
* Azure Functions Core Tools

  ```bash
  npm install -g azure-functions-core-tools@4
  ```
* Azure Cosmos DB Emulator (for local development)
* TypeScript

---

## Installation

```bash
npm install
```

---

## Environment Configuration

Create a `local.settings.json` file:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "",
    "COSMOS_KEY": "",
    "COSMOS_DB": "TaskApp",
    "COSMOS_TASK_CONTAINER": "Tasks",
    "COSMOS_USER_CONTAINER": "Users",
    "COSMOS_FROM_SETTINGS_CONTAINER": "FormSettings",
    "JWT_SECRET": ""
  },
  "ConnectionStrings": {},
  "Host": {
    "CORS": "http://localhost:5173", // client app URL
    "CORSCredentials": true
  }
}
```

---

## Cosmos DB Setup

### Using Cosmos Emulator (Local)

Download Cosmos DB emulator:
[Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator)

Default configuration:

```
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/... (default key)
```

Important:

* Use HTTPS
* Accept SSL certificate in browser: https://localhost:8081

---


## Run Locally

Build project:

run this command from poweshell or vs code terminal:

seed the demo account:

```bash
npm run seed
```
it will create new account with email `demo@email.com` and password `password`

```bash
npm run start-local
```

---

## API List
* AuthLogin: [POST] http://localhost:7071/api/login
```bash
{
    "email": "demo@email.com",
    "password": "password"
}
```
* BulkDeleteTasks: [DELETE] http://localhost:7071/api/tasks/bulk
```bash
{
    "ids": [
        "id-1",
        "id-2
    ]
}
```
* CreateFormSetting: [POST] http://localhost:7071/api/form-settings
```bash
{
  "fields": [
    {
      "id": "60bde0d2-506a-4bdc-b89b-08c913682f7c",
      "label": "Input 1",
      "type": "string",
      "order": 0,
      "isFullWidth": true
    }
  ]
}
```
* DeleteTask: [DELETE] http://localhost:7071/api/tasks/{id}
* GetFormSetting: [GET] http://localhost:7071/api/form-settings
* GetTask: [GET] http://localhost:7071/api/tasks/{id}
* GetTasks: [GET] http://localhost:7071/api/tasks
* InsertTask: [POST] http://localhost:7071/api/tasks
```bash
{
    "title": "Task 1",
    "description": "Task Description",
    "customFields": []
}
```
* UpdateFormSetting: [PUT] http://localhost:7071/api/form-settings/{id}
```bash
{
  "fields": [
    {
      "id": "60bde0d2-506a-4bdc-b89b-08c913682f7c",
      "label": "Input 1",
      "type": "string",
      "order": 0,
      "isFullWidth": true
    }
  ]
}
```
* UpdateTask: [PUT,PATCH] http://localhost:7071/api/tasks/{id}
```bash
{
    "id": "task-id"
    "title": "Task 1",
    "description": "Task Description",
    "customFields": []
}
```