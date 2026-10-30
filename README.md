# Kitameraki Backend

## Local setup

Install Node.js 20+, Azure Functions Core Tools, Docker, and the npm dependencies:

```bash
npm install
```

Start the Cosmos DB emulator:

```bash
docker run --name cosmos-emulator \
  -p 8081:8081 -p 10250:10250 -p 10251:10251 \
  -p 10252:10252 -p 10253:10253 -p 10254:10254 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
```

Copy the environment template, initialize the database, and start the Functions host:

```bash
cp local.settings.example.json local.settings.json
npm run db:init
npm start
```

`npm run db:init` creates the `TaskApp` database, `Tasks` and `FormSettings` containers when needed, with partition key `/organizationId` and the composite index required by task list ordering.

The API is available under `http://localhost:7071/api/tasks`. The example uses the Cosmos DB emulator connection string.

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS certificate validation for the emulator's self-signed certificate. Use it only for local development and never in Azure or production.

`AzureWebJobsStorage` is intentionally empty because this Functions app only uses HTTP triggers, so Azurite is not required.

Core Tools may still log `Unhealthy: Unable to create client for AzureWebJobsStorage`; with an empty storage setting in this HTTP-only app, the warning is harmless and can be ignored locally.
