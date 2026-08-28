# Enterprise Task & Form Settings Service

Azure Functions v4 and TypeScript service for multi-tenant task management and task-form configuration, backed by Azure Cosmos DB for NoSQL.

## Architecture

- Cosmos DB containers are partitioned by `/organizationId`, and transactional reads/writes always provide the tenant partition key.
- JSON schemas in `src/schemas` are the source of truth. They generate TypeScript DTOs during `typegen` and runtime validators through Ajv.
- HTTP functions remain thin transport adapters; business logic lives in services and data access lives in repositories.
- `PATCH` requires `If-Match`, while `PUT task-form-settings` uses `If-Match` when an existing setting is present.

## Local Development

1. Start the emulator:
   ```bash
   docker compose up -d
   ```
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Run Azure Functions Core Tools:
   ```bash
   npm run dev
   ```

`local.settings.json` defaults to the local Cosmos DB emulator connection string. Override the database/container names or production connection values with the environment variables documented in `src/config/cosmos.config.ts`.

## Validation

```bash
npm run lint
npm run build
```
