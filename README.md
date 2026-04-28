# Kitameraki Backend (Azure Functions)

Simple Azure Functions backend for task management backed by Azure Cosmos DB.

## Prerequisites

- Node.js (16+)
- npm
- Azure Functions Core Tools (v4)
- Azure CLI (for deployment)
- Optional: Azurite or Cosmos DB emulator for local testing

## Local Development

1. Clone the repository and install dependencies:

   ```sh
   git clone <repo-url>
   cd kitameraki-be-test
   npm install
   ```

2. Configure Azure Cosmos DB for local development:

   **Option A: Azure Cosmos DB Emulator (Recommended for local testing)**
   
   The Azure Cosmos DB Emulator provides a local environment that emulates the Azure Cosmos DB service for free. It's ideal for development and testing without using Azure resources.

   - Download and install the [Azure Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/how-to-develop-emulator)
   - Start the emulator (runs on `https://localhost:8081` by default)
   - Update `local.settings.json` with emulator credentials:

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "COSMOS_ENDPOINT": "https://localhost:8081",
       "COSMOS_KEY": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
       "COSMOS_REGIONS": "East US,West US",
       "APP_VERSION": "1.0.0",
       "ENVIRONMENT": "development",
       "DEBUG": "true"
     }
   }
   ```

   **Option B: Azure Cosmos DB Account**
   
   If you have an Azure subscription, you can use an actual Cosmos DB account:
   - Create a free Cosmos DB account in the Azure Portal
   - Copy the endpoint and key from the Azure Portal
   - Update `local.settings.json` with your actual credentials

   **Required Configuration:**
   - `COSMOS_ENDPOINT` - Cosmos DB account URI (required)
   - `COSMOS_KEY` - Cosmos DB account key (required for authentication)
   - `COSMOS_REGIONS` - Preferred regions for multi-region deployment (optional, defaults to single region)

3. Start the TypeScript watcher and function host (two terminals):

   ```sh
   npm run watch    # compiles TS in watch mode
   npm start        # starts Azure Functions host
   ```

   Alternatively run `npm run build` and then `func start`.

## Production Deployment

1. Build the project:

   ```sh
   npm run build
   ```

2. Deploy to Azure Functions (ZIP/GitHub Actions/VS Code).

3. Configure App Settings in the Function App (required):

   - `COSMOS_ENDPOINT` (your Cosmos DB account URI)
   - `COSMOS_REGIONS` (comma-separated preferred regions)
   - `APP_VERSION` (optional)
   - `ENVIRONMENT=production`
   - `AzureWebJobsStorage` (storage account connection string)

4. Security:

   - Function keys are required for all endpoints (set `authLevel: "function"`).
   - Generate and manage function keys in Azure Portal or via Azure CLI.
   - Store keys securely and rotate periodically.
   - Pass the key in the `x-functions-key` header on each request.

   Example API call:
   ```bash
   curl -X GET "https://<function-app>.azurewebsites.net/api/GetTasks?organizationId=1" \
     -H "x-functions-key: <your-function-key>"
   ```

## API Endpoints

All endpoints require `x-functions-key` header:

- `GET /GetTasks?organizationId={orgId}&pageNumber={n}&pageSize={n}&searchTerm={q}&status={0|1|2|3}`
- `GET /GetTask?organizationId={orgId}&id={taskId}`
- `POST /InsertTask?organizationId={orgId}` (body: `{ name, description?, status? }`)
- `POST /UpdateTask?organizationId={orgId}&id={taskId}` (body: `{ fields to update }`)
- `POST /UpdateTaskStatus?organizationId={orgId}&id={taskId}` (body: `{ status }`)
- `DELETE /DeleteTask?organizationId={orgId}&id={taskId}`
- `DELETE /BulkDeleteTasks?organizationId={orgId}` (body: `["id1","id2"]`)

## Data Model

- `name` (string, required)
- `description` (string, optional)
- `status` (0=NOT_STARTED, 1=IN_PROGRESS, 2=COMPLETED, 3=CANCELLED)
- `organizationId` (number, required)
- `isDeleted` (boolean)
- `createdAt`, `updatedAt` (ISO 8601 timestamps)

## Notes

- All HTTP endpoints require a valid function key for authentication.
- The project uses `DefaultAzureCredential` and is designed to run with a Managed Identity in production.
- Database operations use soft deletes (`isDeleted` flag).

## Contributing

Open issues or submit pull requests.

## License

No license specified.
