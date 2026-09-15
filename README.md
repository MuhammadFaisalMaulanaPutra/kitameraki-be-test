# Kitameraki Task Management API

Backend API implementation for the Kitameraki Developer Programming Test.

## Tech Stack

- TypeScript
- Azure Functions
- Azure Cosmos DB
- Node.js

## Features

### Task Management

- Get tasks by organization
- Get a task by ID
- Create tasks
- Update tasks
- Delete tasks
- Bulk delete tasks
- Request validation
- Parameterized Cosmos DB queries
- Centralized Cosmos DB client configuration
- Environment-based configuration
- Error handling

### Customizable Task Form

- Get form settings
- Save form settings
- Support for custom task fields
- Supported field types:
  - Text
  - Date
  - Date and Time
  - Email
- Field ordering
- Two-column form configuration

## Project Structure

```text
src/
├── config/
│   └── cosmos.ts
├── functions/
│   ├── BulkDeleteTasks.ts
│   ├── DeleteTask.ts
│   ├── GetFormSettings.ts
│   ├── GetTask.ts
│   ├── GetTasks.ts
│   ├── InsertTask.ts
│   ├── SaveFormSettings.ts
│   └── UpdateTask.ts
├── models/
│   ├── FormSettings.ts
│   ├── Task.ts
│   └── TaskField.ts
├── services/
│   ├── formSettingsService.ts
│   └── taskService.ts
└── index.ts
````

## Getting Started
### Installation
````
npm install
````

## Environment Variables

Configure the following environment variables:
````
COSMOS_DB_CONNECTION_STRING=
COSMOS_DB_DATABASE_NAME=TaskApp
COSMOS_DB_CONTAINER_NAME=Tasks
COSMOS_DB_FORM_SETTINGS_CONTAINER_NAME=FormSettings
````
For local development, Azure Functions configuration can be provided through local.settings.json.

#### Do not commit Cosmos DB credentials to the repository.

## Build
````
npm run build
````
## Run Locally
````
npm start
````
The Azure Functions API runs locally on:
````
http://localhost:7071
````
## Form Settings API
````
GET  /api/form-settings?organizationId={organizationId}
PUT  /api/form-settings
````
### Notes

- A valid Azure Cosmos DB connection string and configured Cosmos DB containers are required to run the backend against a real Cosmos DB instance.
- Cosmos DB runtime integration was not tested against a live database because no live Cosmos DB credentials were provided for the programming test.
- The implementation uses environment variables for database configuration and does not include credentials in the repository.
