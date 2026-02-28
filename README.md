# Task Management - Backend (Azure Functions)

This is the backend service for the Task Management App, built with Azure Functions (Node.js) and Azure Cosmos DB.

## Tech Stack
- **Runtime**: Node.js 18+ (Azure Functions v4)
- **Database**: Azure Cosmos DB
- **Validation**: Zod
- **API Pattern**: Repository & Service Pattern

## How to Run Locally

### 1. Prerequisites
- **Node.js v18+**
- **Azure Functions Core Tools** (`npm install -g azure-functions-core-tools@4`)
- **Cosmos DB Emulator** or a live **Azure Cosmos DB** instance.

### 2. Manual Database Setup
Before configuring the environment, you must manually create the following infrastructure in your Azure Cosmos DB account. **Ensure you select "Azure Cosmos DB for NoSQL" as the API.**

1.  **Create the Database and the first Container**:
    *   Click **New Container**.
    *   Database id: Select **Create new** and name it exactly `TaskApp`.
    *   Container id: Type `Tasks`.
    *   Partition key: Type exactly `/organizationId`.
    *   Click OK to create.
    
2.  **Create the second Container**:
    *   Once the first step is done, click **New Container** again.
    *   Database id: Select **Use existing** and choose `TaskApp`.
    *   Container id: Type `Settings`.
    *   Partition key: Type exactly `/organizationId`.
    *   Click OK to create.

> [!IMPORTANT]
> Ensure the **Partition Key** for both containers is exactly `/organizationId` (case-sensitive) to ensure the API functions correctly.

### 3. Setup Environment
To run the Azure Functions backend locally, you must have **both** a `.env` file for secrets/variables and a `local.settings.json` file for the Azure Functions runtime configuration.

#### A. Create the Secrets File (`.env`)
Create a `.env` file in the root directory to store your database connection string and names. You can use the provided `.env.example` file as a template:
```bash
cp .env.example .env
```
```env
COSMOS_CONNECTION_STRING=AccountEndpoint=...;AccountKey=...;
COSMOS_DATABASE=TaskApp
COSMOS_CONTAINER=Tasks
COSMOS_SETTINGS_CONTAINER=Settings
```

#### B. Create the Runtime Config (`local.settings.json`)
The Azure Functions host (`func start`) absolutely requires this file to run. Create a `local.settings.json` in the root directory. You can use the provided `local.settings.json.example` file as a template:
```bash
cp local.settings.json.example local.settings.json
```
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_SETTINGS_CONTAINER": "Settings"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*"
  }
}
```
*Note: Our `dotenv` configuration allows `.env` to override `Values` mapping in `local.settings.json`.*

### 4. Install & Start
```bash
# Install dependencies
bun install or npm install

# Start the Azure Functions host
func start
```

The API will be available at `http://localhost:7071/api`.

## Project Structure

The backend is built with Azure Functions and follows a **Repository & Service Pattern** for clean data access and business logic separation.

- **`src/modules/tasks/`**: Core logic for task management.
  - `functions/`: Azure Function entry points (HTTP triggers).
  - `repositories/`: Data access layer using Cosmos DB.
  - `models/`: Zod schemas for validation and API documentation.
  - `types/`: Internal TypeScript interfaces and models.
- **`src/modules/settings/`**: Logic for form builder and customization settings.
  - `functions/`: Endpoints for getting/updating organization settings.
  - `repositories/`: Settings-specific repository logic.
  - `types/`: Dynamic field definitions and configuration schemas.
- **`src/core/`**: Shared infrastructure and utilities.
  - `cosmos.ts`: Centralized Azure Cosmos DB client and container initialization.
  - `config.ts`: Environment variable management and validation.
  - `types/`: Global shared types and error models.


