# Kitameraki BE Test — Enterprise Task & Form Settings Service

Azure Functions v4 + TypeScript API for multi-tenant task management and task-form configuration, backed by Azure Cosmos DB for NoSQL (partitioned by `/organizationId`).

---

## Requirements

| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| **mise** | `>= 2024.x` | Version manager for Node.js (defined in `mise.toml`) | `curl https://mise.run \| sh` — see [mise.jdx.dev](https://mise.jdx.dev/getting-started.html) |
| **Node.js** | `latest` (managed by mise, currently `26.7.0`) | Runtime & build | `mise install` (reads `mise.toml`) |
| **npm** | `>= 10` (bundled with Node) | Package manager | Comes with Node |
| **Docker** | `>= 24` + Compose v2 | Local Cosmos DB Linux Emulator | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Azure Functions Core Tools** | `v4` (`4.13.0` tested) | `func start` local host | `npm i -g azure-functions-core-tools@4 --unsafe-perm true` |

> Verify after install:
> ```bash
> mise --version
> node --version   # via mise
> npm --version
> docker --version && docker compose version
> func --version
> ```

Other dev tools are pinned in `package.json`: `typescript ^7`, `biome 1.8.3`, `cpx2`, `tsc-alias`.

### npm Scripts vs Direct Node Commands

Most workflows use npm scripts, but the underlying scripts can also be run directly with `node`:

| npm script | Direct command | What it does |
|------------|----------------|--------------|
| `npm run typegen` | `node ./scripts/generate-types.mjs` | Compile `src/schemas/*.schema.json` → `src/models/generated/*.d.ts` via `json-schema-to-typescript` |
| *(no npm alias)* | `node ./scripts/setup-cosmos.mjs` | Create database/containers (MultiHash `/organizationId` + `/id`) and seed 145 mock tasks |

```bash
# Equivalent — via npm
npm run typegen

# Equivalent — direct
node ./scripts/generate-types.mjs

# Cosmos bootstrap (no npm alias — run directly, requires emulator running + COSMOS_CONNECTION_STRING)
node ./scripts/setup-cosmos.mjs
```

---

## Cosmos DB Configuration

### 1. Docker (Linux Emulator)

The repo ships a cross-platform emulator via `docker-compose.yml`:

```yaml
services:
  cosmos-emulator:
    image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
    ports: ["8081:8081", "10250-10255:10250-10255"]
    environment:
      - AZURE_COSMOS_EMULATOR_PARTITION_COUNT=5
      - AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=true
      - AZURE_COSMOS_EMULATOR_IP_ADDRESS_OVERRIDE=127.0.0.1
```

Start / stop:

```bash
docker compose up -d          # start emulator (pulls ~1GB on first run)
docker compose logs -f cosmos-emulator
docker compose down           # stop
docker compose down -v        # stop + wipe persisted data (/tmp/cosmos/appdata)
```

Explorer UI (once ready, ~30-60s): `https://localhost:8081/_explorer/index.html`

> **Note:** `AZURE_COSMOS_EMULATOR_IP_ADDRESS_OVERRIDE=127.0.0.1` is required on Linux/macOS so the SDK can reach the emulator via `localhost`. Without it the emulator advertises its internal container IP and the SDK gets `ECONNREFUSED`.

### 2. Cross-Platform Notes

| OS | Recommended emulator | Notes |
|----|----------------------|-------|
| **Linux / macOS / WSL2** | **Linux Emulator (Docker)** — this repo's default | Works everywhere Docker runs. No Windows-only MSI needed. |
| **Windows (native)** | Windows Cosmos DB Emulator (MSI) *or* Linux Docker image | If using the MSI, change `COSMOS_CONNECTION_STRING` to `https://localhost:8081/` with the Windows emulator key and keep `NODE_TLS_REJECT_UNAUTHORIZED=0`. The Docker image is preferred for parity with CI. |
| **CI / Headless** | Linux Emulator Docker image | Same `docker compose up -d` — add a healthcheck wait (`curl -k https://localhost:8081/_explorer/emulator.pem`) before `npm run dev`. |

No code changes are needed per OS — only `local.settings.json` / env vars differ between emulator vs. real Azure Cosmos DB.

### 3. Connection & Environment Variables

Resolved in `src/config/cosmos.config.ts` (priority order):

1. `COSMOS_CONNECTION_STRING` (preferred for local/dev) — full connection string.
2. `COSMOS_ENDPOINT` + `COSMOS_KEY` — alternative split form for Azure.
3. Throws if neither is set.

| Variable | Default | Description |
|----------|---------|-------------|
| `COSMOS_CONNECTION_STRING` | — (required) | `AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/...;` for emulator, or `https://<account>.documents.azure.com:443/;AccountKey=...;` for Azure |
| `COSMOS_ENDPOINT` | — | Alternative to connection string (e.g. `https://<account>.documents.azure.com:443/`) |
| `COSMOS_KEY` | — | Paired with `COSMOS_ENDPOINT` |
| `COSMOS_DATABASE_NAME` | `TaskApp` | Database name |
| `COSMOS_TASKS_CONTAINER` | `Tasks` | Tasks container (partition key `/organizationId`) |
| `COSMOS_SETTINGS_CONTAINER` | `TaskFormSettings` | Form settings container (partition key `/organizationId`) |
| `AzureWebJobsStorage` | `UseDevelopmentStorage=true` | Functions storage emulator (Azurite/local) |
| `FUNCTIONS_WORKER_RUNTIME` | `node` | Must be `node` |

> `scripts/setup-cosmos.mjs` reads the same values from `local.settings.json` (`.Values`) with env-var override and supports the legacy fallback `COSMOS_FORM_SETTINGS_CONTAINER` → `COSMOS_SETTINGS_CONTAINER` (default `FormSettings`). It also respects `NODE_TLS_REJECT_UNAUTHORIZED=0` for the self-signed emulator cert.

Setup:

```bash
cp local.settings.json.example local.settings.json
# local.settings.json is gitignored — never commit secrets
```

Emulator defaults already in `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DATABASE_NAME": "TaskApp",
    "COSMOS_TASKS_CONTAINER": "Tasks",
    "COSMOS_SETTINGS_CONTAINER": "TaskFormSettings",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": { "LocalHttpPort": 7071, "CORS": "*" }
}
```

#### Cosmos Bootstrap Script — `node ./scripts/setup-cosmos.mjs`

Idempotently provisions the Cosmos infrastructure and seeds dev data. Run **after** `docker compose up -d` and **before** `npm run dev` on a fresh clone:

```bash
docker compose up -d
# wait ~30-60s for emulator
node ./scripts/setup-cosmos.mjs
```

What it does (`scripts/setup-cosmos.mjs`):
1. Loads config from `local.settings.json` → `Values` (env vars take precedence). Requires `COSMOS_CONNECTION_STRING`.
2. Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` at runtime if configured (emulator self-signed cert).
3. `createIfNotExists` database (`COSMOS_DATABASE_NAME`, default `TaskApp`).
4. For each container (`Tasks` + `TaskFormSettings`/`FormSettings`), verifies the MultiHash partition key `[/organizationId, /id]` (`PartitionKeyDefinitionVersion.V2`, `PartitionKeyKind.MultiHash`). If the key mismatches, it **drops and recreates** the container — otherwise it leaves it as-is.
5. Seeds **145 mock tasks** (via `@faker-js/faker`) into the Tasks container under a random `organizationId` (titles, statuses `todo|in_progress|done`, priorities, due dates, assignees) — useful for immediately testing `GET /tasks` pagination/search.

Re-running is safe (containers are verified, not duplicated), but seeding appends another 145 tasks each time. To start clean: `docker compose down -v && docker compose up -d && node ./scripts/setup-cosmos.mjs`.


For **real Azure Cosmos DB**, replace the connection string and remove `NODE_TLS_REJECT_UNAUTHORIZED`:

```json
"COSMOS_CONNECTION_STRING": "AccountEndpoint=https://<your-account>.documents.azure.com:443/;AccountKey=<key>;"
```

Database/containers are auto-created on first SDK call if they don't exist (ensure partition key is `/organizationId`).

### 4. SSL / TLS Configuration

The Cosmos DB Emulator uses a **self-signed certificate** (`https://localhost:8081`). Node.js rejects it by default (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).

**Option A — Disable verification (local dev only, default in this repo):**

`local.settings.json` already sets:

```json
"NODE_TLS_REJECT_UNAUTHORIZED": "0"
```

This tells Node to trust the emulator cert. **Never use in production** — remove the variable or set it to `1` when targeting real Azure.

**Option B — Trust the emulator certificate (more secure):**

```bash
# 1. Download the emulator cert (emulator must be running)
curl -k https://localhost:8081/_explorer/emulator.pem -o /tmp/cosmos-emulator.pem

# macOS — add to system keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/cosmos-emulator.pem

# Linux — add to CA store (Debian/Ubuntu)
sudo cp /tmp/cosmos-emulator.pem /usr/local/share/ca-certificates/cosmos-emulator.crt
sudo update-ca-certificates

# Windows (PowerShell, Admin)
Import-Certificate -FilePath C:\tmp\cosmos-emulator.pem -CertStoreLocation Cert:\LocalMachine\Root

# Then remove NODE_TLS_REJECT_UNAUTHORIZED from local.settings.json or set to "1"
```

Verify TLS:

```bash
# Should succeed without -k after trusting
curl https://localhost:8081/_explorer/emulator.pem -o /dev/null -v
```

---

## API Endpoints

Base URL (local): `http://localhost:7071/api` — controlled by `Host.LocalHttpPort` in `local.settings.json` / `host.json` (`extensionBundle` `[4.*, 5.0.0)`).

All routes are multi-tenant via `organizationId` path param. Cosmos operations always supply the partition key (`organizationId`). Auth level: `anonymous` (add your auth middleware as needed).

| # | Method | Route | Function | Description |
|---|--------|-------|----------|-------------|
| 1 | `POST` | `/api/organizations/{organizationId}/tasks` | `CreateTask` | Create a task |
| 2 | `GET` | `/api/organizations/{organizationId}/tasks` | `ListTasks` | List/search/paginate tasks |
| 3 | `GET` | `/api/organizations/{organizationId}/tasks/{id}` | `GetTaskById` | Get task by ID |
| 4 | `PUT` | `/api/organizations/{organizationId}/tasks/{id}` | `UpdateTask` | Replace/patch task fields |
| 5 | `DELETE` | `/api/organizations/{organizationId}/tasks/{id}` | `DeleteTask` | Delete single task (`204 No Content`) |
| 6 | `POST` | `/api/organizations/{organizationId}/tasks/batch-delete` | `BatchDeleteTasks` | Bulk delete (`{ ids: string[] }`, max 1000) |
| 7 | `GET` | `/api/organizations/{organizationId}/task-form-settings` | `GetTaskFormSettings` | Get form field config (returns `[]` if none, `ETag` if exists) |
| 8 | `PUT` | `/api/organizations/{organizationId}/task-form-settings` | `PutTaskFormSettings` | Create/update form config (uses `If-Match` for OCC) |

### Request / Response Details

**Common headers:**
- `If-Match: "<etag>"` — required on `PUT /task-form-settings` when a setting already exists (optimistic concurrency, returns `409 Conflict` on stale etag, `400` on empty etag). `GET` returns `ETag` header.
- `Content-Type: application/json`

**Create Task — `POST /tasks`**
```bash
curl -X POST http://localhost:7071/api/organizations/org_123/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design review",
    "status": "todo",
    "priority": "high",
    "description": "Q3 roadmap review",
    "dueDate": "2026-09-01T00:00:00.000Z",
    "assigneeId": "user_42"
  }'
```
Schema (`src/schemas/create-task.schema.json`): `title`*, `status`* (`todo|in_progress|done`), `priority`* (`low|medium|high`), `description`, `dueDate` (date-time), `assigneeId`.

**List Tasks — `GET /tasks?status=todo&priority=high&sortBy=createdAt&sortOrder=desc&page=1&pageSize=20&search=review`**

Query params (`task-query.schema.json`): `status`, `priority`, `sortBy` (`createdAt|updatedAt|title|dueDate`), `sortOrder` (`asc|desc`), `page` (≥1, default 1), `pageSize` (1-100, default 20), `search` (string), `continuationToken`.

Response includes `meta` pagination (`calculatePagination`).

**Update Task — `PUT /tasks/{id}`**
```bash
curl -X PUT http://localhost:7071/api/organizations/org_123/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "priority": "medium"}'
```
Schema (`patch-task.schema.json`): at least one of `title`, `description` (nullable), `status`, `priority`, `dueDate` (nullable), `assigneeId` (nullable).

**Batch Delete — `POST /tasks/batch-delete`**
```bash
curl -X POST http://localhost:7071/api/organizations/org_123/tasks/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2"]}'
```

**Form Settings — `PUT /task-form-settings`**
```bash
# Get current etag
curl -i http://localhost:7071/api/organizations/org_123/task-form-settings
# -> ETag: "0000..."

curl -X PUT http://localhost:7071/api/organizations/org_123/task-form-settings \
  -H "Content-Type: application/json" \
  -H 'If-Match: "0000..."' \
  -d '{
    "fields": [
      {"name": "customField1", "label": "Custom Field", "type": "text", "required": false, "width": "full"},
      {"name": "dueEmail", "label": "Notify Email", "type": "email", "required": true, "width": "half", "placeholder": "you@example.com"}
    ]
  }'
```
Field schema (`put-task-form-setting.schema.json`): `name` (regex `^[a-zA-Z][a-zA-Z0-9_]{0,63}$`, unique), `label` (1-100 chars), `type` (`text|date|datetime|email`), `required` (bool), `width` (`full|half`), `placeholder` (≤200). Max 100 fields.

**Error format** (via `http-handler.wrapper`): `application/problem+json`
```json
{ "message": "Validation failed", "data": [{ "field": "title", "message": "Required" }] }
```

---

## Build and Run

### 1. Clone & Install

```bash
git clone <repo-url> kitameraki-be-test
cd kitameraki-be-test

# Install correct Node.js via mise (reads mise.toml: node = "latest")
mise install
# Or if you don't use mise: ensure Node >= 20 and npm >= 10 manually

npm install
```

### 2. Configure

```bash
cp local.settings.json.example local.settings.json
# Edit COSMOS_* values if targeting real Azure; emulator defaults work out of the box
```

### 3. Start Cosmos DB

```bash
docker compose up -d
# Wait ~30-60s, then verify:
curl -k https://localhost:8081/_explorer/emulator.pem -o /dev/null && echo "Emulator ready"
# Explorer: https://localhost:8081/_explorer/index.html
```

### 4. Build

```bash
npm run typegen                    # same as: node ./scripts/generate-types.mjs
node ./scripts/generate-types.mjs # direct: compile JSON Schemas → TypeScript types
node ./scripts/setup-cosmos.mjs   # direct: provision Cosmos DB + seed 145 mock tasks
npm run build                      # clean + typegen + tsc + tsc-alias + copy schemas to dist/
npm run lint                       # Biome check (2-space, single quotes, no semis, 100 width)
npm run lint:fix                   # auto-fix + organize imports
```

> `node ./scripts/generate-types.mjs` reads `src/schemas/*.schema.json`, compiles each with `json-schema-to-typescript` (`bannerComment: biome-ignore`, `format: true`), and writes `src/models/generated/<name>.d.ts` concurrently (fails fast if any schema is invalid, reports duration). `node ./scripts/setup-cosmos.mjs` is the only script without an npm alias — always run it directly.

`dist/` is build output (do not edit). `src/models/generated/**` is generated — never edit manually.

### 5. Run

| Command | What it does |
|---------|--------------|
| `npm run dev` | Watch (`tsc -w` + `tsc-alias -w` + `typegen`) + `func start` on `http://localhost:7071` |
| `npm start` | `prestart` (clean+build) then `func start` (single build) |
| `npm run watch` | TypeScript watch only (no Functions host) |
| `npm run watch:tsc` / `watch:alias` | Individual watchers |

```bash
npm run dev
# Functions host prints routes, e.g.:
# CreateTask: [POST] http://localhost:7071/api/organizations/{organizationId}/tasks
```

Test quickly:

```bash
curl http://localhost:7071/api/organizations/demo_org/tasks
curl http://localhost:7071/api/organizations/demo_org/task-form-settings
```

### 6. Project Structure

```
src/functions/        # Azure Functions v4 handlers (tasks/*, settings/*)
src/services/         # Business logic (TaskService, TaskFormSettingService)
src/repositories/     # Cosmos DB access (partition key always supplied)
src/schemas/*.json    # JSON Schema — source of truth
src/models/generated/ # Generated types (json-schema-to-typescript)
src/models/ src/config/ src/middleware/ src/utils/ src/errors/
host.json             # Functions extensionBundle [4.*, 5.0.0)
docker-compose.yml    # Linux Cosmos DB Emulator
mise.toml             # node = "latest"
```

Flow: `HTTP → http-handler.wrapper → validate.middleware (Ajv) → service → repository → Cosmos DB`.
