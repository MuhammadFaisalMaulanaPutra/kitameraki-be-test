# Kitameraki Task Management API

Back-end for the Task Management app — **Azure Functions (Node.js v4 programming model) + Azure Cosmos DB**, written in TypeScript.

This repository was refactored from the original test scaffold to improve **security, readability, and maintainability**. See [What changed](#what-changed-in-the-refactor).

---

## Tech stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Runtime        | Azure Functions v4 (`@azure/functions` v4)         |
| Language       | TypeScript (`strict` mode)                         |
| Database       | Azure Cosmos DB (`@azure/cosmos` v4)               |
| Validation     | Zod                                                |
| Tests          | Node.js built-in test runner (`node:test`)         |

---

## Prerequisites

- **Node.js 20 LTS** (recommended — the Azure Functions host is validated against 18/20).
- **Azure Functions Core Tools v4** — `npm i -g azure-functions-core-tools@4`
- **Azure Cosmos DB Emulator** (local) — see below. Alternatively, point at a real Cosmos DB account.

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy the template, then edit if needed)
cp local.settings.json.example local.settings.json

# 3. Start the Cosmos DB Emulator, then create the database + containers
npm run setup:db

# 4. Start the API (builds first, then runs the Functions host)
npm start
```

The API runs at `http://localhost:7071/api`.

### Cosmos DB Emulator

The included `local.settings.json.example` is pre-filled with the emulator's
well-known endpoint and key (a public, documented value — not a secret), so the
app works out of the box once the emulator is running.

- **Windows:** install the [Azure Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/how-to-develop-emulator).
- **Docker (any OS):** `docker run -p 8081:8081 -p 10250-10255:10250-10255 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator`

> `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in `local.settings.json` **only** to
> accept the emulator's self-signed certificate for local development. Remove it
> when pointing at a real Cosmos DB account.

### Point at a real Cosmos DB account

Replace `COSMOS_CONNECTION_STRING` in `local.settings.json` with your account's
primary connection string and remove `NODE_TLS_REJECT_UNAUTHORIZED`.

---

## API reference

Base URL: `/api`. All endpoints are scoped by `organizationId` (the Cosmos
partition key), passed as a query parameter.

| Method   | Route                | Description                                    |
| -------- | -------------------- | ---------------------------------------------- |
| `GET`    | `/tasks`             | List tasks — paginated, filterable, searchable |
| `GET`    | `/tasks/{id}`        | Get one task                                   |
| `POST`   | `/tasks`             | Create a task                                  |
| `PATCH`  | `/tasks/{id}`        | Update a task (incl. status change)            |
| `DELETE` | `/tasks/{id}`        | Delete a task                                  |
| `POST`   | `/tasks/bulk-delete` | Delete many tasks — body `{ "ids": [...] }`    |
| `GET`    | `/form-settings`     | Get the org's form config (Part 2)             |
| `PUT`    | `/form-settings`     | Create/replace the org's form config (Part 2)  |

### `GET /tasks` query parameters

| Param            | Type                                   | Default | Notes                       |
| ---------------- | -------------------------------------- | ------- | --------------------------- |
| `organizationId` | string (required)                      | —       |                             |
| `page`           | number                                 | `1`     |                             |
| `pageSize`       | number (max 100)                       | `10`    |                             |
| `status`         | `todo` \| `in-progress` \| `completed` | —       | filter                      |
| `priority`       | `low` \| `medium` \| `high`            | —       | filter                      |
| `search`         | string                                 | —       | case-insensitive title/desc |

Response: `{ items, page, pageSize, total, totalPages }`.

Errors use a consistent envelope: `{ "error": { "message": "...", "details"?: ... } }`
with proper status codes (`400` validation, `404` not found, `500` server error).

---

## Scripts

| Script             | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `npm start`        | Clean, build, and run the Functions host |
| `npm run build`    | Type-check + compile to `dist/`          |
| `npm run setup:db` | Create the Cosmos database + containers  |
| `npm test`         | Run unit tests (`node:test`)             |
| `npm run lint`     | ESLint                                   |

---

## What changed in the refactor

**Security**
- Removed the **hard-coded connection string** from every function → loaded from
  environment/App Settings via a single validated `config` module; secrets stay
  out of source control (`local.settings.json` is git-ignored).
- Fixed **SQL injection** in the task list: the `organizationId`/search filters
  are now **parameterized** (`SqlQuerySpec` bind parameters), never string-interpolated.
- Added **input validation** (Zod) on every request. Bodies can no longer inject
  arbitrary fields, and `id`/`organizationId` are set server-side.
- Documented production **auth** guidance (endpoints are `anonymous` for the demo).

**Correctness**
- Fixed the **`BulkDeleteTasks` bug**: `forEach(async …)` returned before the
  deletes ran and swallowed errors → now awaits all deletes (`Promise.all`), and
  is idempotent for already-deleted ids.
- Proper **HTTP status codes** and a centralized error handler — no more `200 OK`
  on failures.

**Readability & maintainability**
- **Shared CosmosClient singleton** instead of a new client per request.
- Layered structure: `functions/` (thin handlers) → `repositories/` → `cosmos/`,
  with `schemas/`, `http/`, `config/`, `domain/`.
- `strict` TypeScript, ESLint, unit tests, and this documentation.

**Features added for the client app**
- `GET /tasks` gained **pagination + filtering + search** (server-side).
- Part 2 **form-settings** endpoints (`GET`/`PUT /form-settings`).

---

## Deployment (notes)

Deploy to an Azure Function App (`func azure functionapp publish <app-name>`),
set `COSMOS_CONNECTION_STRING` and the container names in Application Settings,
and configure CORS for the front-end origin. For production, switch the HTTP
`authLevel` from `anonymous` to `function` (or front the API with Azure AD / APIM).
