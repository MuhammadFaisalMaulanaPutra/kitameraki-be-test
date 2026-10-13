# Kitameraki Backend API

Multi-tenant Task Management and Dynamic Form Configuration API built with **Azure Functions v4** (Node.js/TypeScript), **Azure Cosmos DB for NoSQL**, and **Zod**.

## Prerequisites

- **Node.js** 20.x or later
- **Azure Functions Core Tools** v4 (`npm install -g azure-functions-core-tools@4 --unsafe-perm true`)
- **Azure Cosmos DB** instance or **Azure Cosmos DB Emulator**

## Environment Configuration

Configure environment variables in `local.settings.json` (under `Values`) or in a `.env` file at the project root:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `COSMOS_CONNECTION_STRING` | Yes | — | Azure Cosmos DB connection string (`AccountEndpoint=...;AccountKey=...;`) |
| `COSMOS_DATABASE_NAME` | No | `TaskApp` | Cosmos DB database identifier |
| `COSMOS_CONTAINER_NAME` | No | `Tasks` | Cosmos DB tasks container identifier |
| `NODE_ENV` | No | `development` | Runtime environment (`development` or `production`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | No | — | Set to `"0"` locally only when using the Cosmos DB Emulator self-signed certificate |

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. (Optional) Seed sample organizations, tasks, and form settings
npm run seed

# 4. Start the Azure Functions host (http://localhost:7071)
npm start
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Compiles TypeScript and resolves path aliases to `dist/` |
| `npm run watch` | Runs the TypeScript compiler in watch mode |
| `npm run clean` | Removes the `dist/` build directory |
| `npm start` | Cleans, builds, and launches `func start` |
| `npm run seed` | Builds and seeds initial tasks and form configurations into Cosmos DB |
| `npm test` | Builds and runs the automated schema and security test suites |

## API Reference

Base URL (local): `http://localhost:7071/api`

| Method | Route | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/organizations` | None | List all distinct organization UUIDs (auto-seeds if database is empty) |
| `GET` | `/api/tasks` | `organizationId` (required), `priority`, `status`, `tags` (comma-separated, max 10), `startDate` (`YYYY-MM-DD`), `endDate` (`YYYY-MM-DD`), `search` (max 100 chars), `page` (default `1`), `limit` (default `10`, max `100`) | List and filter paginated tasks for an organization |
| `GET` | `/api/tasks/{id}` | `organizationId` (required) | Retrieve a single task by ID and organization |
| `POST` | `/api/tasks` | `organizationId` (optional fallback if omitted in body) | Create a new task (supports standard fields and dynamic `customFields`) |
| `PATCH` | `/api/tasks/{id}` | `organizationId` (required) | Partially update an existing task |
| `DELETE` | `/api/tasks/{id}` | `organizationId` (required) | Delete a single task by ID and organization |
| `DELETE` | `/api/tasks/bulk-delete` | `organizationId` (required), `taskIds` (required, comma-separated UUIDs, max 50) | Bulk delete multiple tasks within an organization |
| `GET` | `/api/form-settings` | `organizationId` (required) | Get custom form builder configuration for an organization |
| `PUT` / `POST` | `/api/form-settings` | `organizationId` (required) | Upsert custom form builder components (max 100 components) |
