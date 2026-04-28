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

2. Create or update `local.settings.json` (example):

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "COSMOS_ENDPOINT": "https://<your-cosmos-account>.documents.azure.com:443/",
       "COSMOS_REGIONS": "East US",
       "APP_VERSION": "1.0.0",
       "ENVIRONMENT": "development",
       "DEBUG": "true"
     }
   }
   ```

   - For local Cosmos development use the Cosmos emulator or point `COSMOS_ENDPOINT` to a test account.

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

4. Security recommendations:

   - Enable Managed Identity for the Function App and grant it access to Cosmos DB (preferred).
   - Use Azure Key Vault for secrets and connection strings.
   - Protect HTTP endpoints with authentication (Azure AD or function keys) before exposing publicly.

## API Endpoints

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

- The project uses `DefaultAzureCredential` and is designed to run with a Managed Identity in production.
- All HTTP endpoints are currently open (`authLevel: "anonymous"`). Secure and authenticate before production use.
- Database operations use soft deletes (`isDeleted` flag).

## Contributing

Open issues or submit pull requests.

## License

No license specified.
