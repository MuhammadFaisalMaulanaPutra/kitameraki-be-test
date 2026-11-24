# Task Management API

REST API for the Kitameraki Task Management App — **Express 5 + TypeScript + Azure Cosmos DB + Azure Blob Storage**, deployable to **Azure Function App** (v4 programming model) and runnable as a plain Node server / Docker container.

- Swagger UI: `http://localhost:7071/api/docs` (OpenAPI JSON: `/api/docs.json`)
- Postman collection: [`postman/Kitameraki - Task Management API.postman_collection.json`](postman/) (36 requests; `npx newman run "postman/Kitameraki - Task Management API.postman_collection.json" --working-dir postman` so "Upload File" finds `sample-attachment.txt`)

## Repositories

- **Root repository:** https://github.com/zulkifliraihan/test_kitameraki
- **Frontend repository (private):** https://github.com/zulkifliraihan/test_kitameraki-fe
  Access invitations have been sent to me@abdulhalimzhr.com, muhammadfaisalmaulanaputra2024@gmail.com, and faiz.sulistiyo@gmail.com. The invitation can be accepted through the following link: https://github.com/zulkifliraihan/test_kitameraki-fe/invitations
- **Backend repository:** https://github.com/zulkifliraihan/test_kitameraki-be
- **Backend pull request to the `main` branch:** https://github.com/MuhammadFaisalMaulanaPutra/kitameraki-be-test/pull/50

---

## Quick start (Docker — one command)

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| API | http://localhost:7071/api |
| Swagger UI | http://localhost:7071/api/docs |
| Cosmos DB emulator (Data Explorer) | http://localhost:1234 |
| Azurite — Blob Storage emulator | http://localhost:10000/devstoreaccount1 |

The stack uses the [Azure Cosmos DB Linux emulator (vNext)](https://learn.microsoft.com/azure/cosmos-db/emulator-linux) and [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) (blob service only, `mcr.microsoft.com/azure-storage/azurite:3.38.0`), both running natively on x64 **and ARM64 / Apple Silicon**. The database (`TaskApp`), its containers (`Tasks`, `FormSettings`, both partitioned by `/organizationId`) and the private blob container for uploaded files (`task-files`) are created automatically on start-up.

Optional sample data (12 tasks):

```bash
docker compose exec api node dist/scripts/seed.js
```

> To run the **whole app** (API + web client), use the `docker-compose.yml` in the parent folder.

## Local development (without Docker for the API)

Requirements: Node.js 20+, a Cosmos DB and a Storage account (the emulators from `docker compose up cosmosdb azurite`, or Azure).

```bash
cp .env.example .env        # adjust COSMOS_* / AZURE_STORAGE_CONNECTION_STRING if needed
npm install
docker compose up -d cosmosdb azurite   # local emulators
npm run dev                 # http://localhost:7071/api (hot reload)
npm run seed                # optional sample data
```

### Running as an Azure Function App

```bash
cp local.settings.example.json local.settings.json
npm run start:func          # requires Azure Functions Core Tools v4
```

`src/functions/api.ts` registers one catch-all HTTP trigger that forwards requests to the same Express app (`host.json` sets `routePrefix` to `""`), so routes, validation and error handling are identical locally and on Azure.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the API with hot reload (tsx) |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled server |
| `npm run start:func` | Build and start with Azure Functions Core Tools |
| `npm test` / `npm run test:coverage` | Jest unit + integration tests (`tests/`) |
| `npm run lint` / `npm run lint:fix` | ESLint (typescript-eslint, flat config) |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run typecheck` | TypeScript type check (`src` + `tests`) |
| `npm run seed` | Insert sample tasks |

---

## Architecture

```
HTTP request
  └─ Route        (src/routes)        URL + HTTP method -> controller
     └─ Controller (src/controllers)  validate request (zod), shape response
        └─ Service    (src/services)  business rules (validate tasks against the form settings, merge, bulk delete, files)
           └─ Interface  (src/interfaces)        ITaskRepository / IFormSettingsRepository / IFileRepository
              └─ Repository (src/repositories/cosmos | blob)  Cosmos DB queries / Blob Storage
                 └─ Azure Cosmos DB / Azure Blob Storage
```

All dependencies are wired in a single composition root (`src/container.ts`). Services only know the repository **interfaces**, so tests use in-memory repositories and the storage can be swapped without touching business logic.

```
backend/
├── src/
│   ├── adapters/        Azure Functions HTTP trigger -> Express bridge
│   ├── config/          Environment validation (fails fast on bad config)
│   ├── controllers/     HTTP layer
│   ├── database/        Cosmos client + Blob container client, resource bootstrap
│   ├── docs/            OpenAPI 3 document (Swagger)
│   ├── functions/       Azure Function registrations
│   ├── interfaces/      Repository contracts
│   ├── middlewares/     Tenant context, error handler, rate limiter, multipart file upload
│   ├── models/          Domain types and constants
│   ├── repositories/    cosmos/ (tasks, form settings + migrations) and blob/ (uploaded files)
│   ├── routes/          Express routers
│   ├── scripts/         Seed script
│   ├── services/        Business logic
│   ├── utils/           Errors, response helpers, logger, retry
│   ├── validators/      zod schemas + validation helpers
│   ├── app.ts           Express app factory
│   ├── container.ts     Composition root (DI)
│   ├── index.ts         Azure Functions app setup
│   └── server.ts        Standalone HTTP server
├── tests/               Jest tests (outside src/)
│   ├── helpers/         In-memory repositories, test app factory
│   ├── integration/     HTTP tests with supertest
│   └── unit/            Services, validators, repositories, middlewares, adapter
├── postman/             Postman collection + sample-attachment.txt
├── Dockerfile / docker-compose.yml
├── task.schema.json / form-settings.schema.json
└── host.json / local.settings.example.json   Azure Functions config
```

## Endpoints

Every `/tasks`, `/form-settings` and `/files` request must send the tenant header **`x-organization-id: <uuid>`**.

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | Health check | 200 |
| GET | `/api/tasks` | List tasks — `page`, `pageSize` (≤100), `search`, `status`, `priority`, `tag`, `sortBy`, `sortOrder` | 200 |
| POST | `/api/tasks` | Create a task | 201 (+ `Location`) |
| GET | `/api/tasks/:id` | Get a task | 200 |
| PUT | `/api/tasks/:id` | Replace the editable fields of a task | 200 |
| PATCH | `/api/tasks/:id` | Partial update (e.g. `{ "status": "completed" }`) | 200 |
| DELETE | `/api/tasks/:id` | Delete a task | 204 |
| POST | `/api/tasks/bulk-delete` | Delete up to 100 tasks: `{ "ids": [...] }` | 200 |
| GET | `/api/form-settings` | Get the task form settings (the task template if never saved) | 200 |
| PUT | `/api/form-settings` | Save the form settings: `{ "rows": [...], "versionTag"?: "v1" }` | 200 |
| POST | `/api/files` | Upload a file (`multipart/form-data`, part `file`, ≤ `FILE_MAX_SIZE_BYTES`) → `{ id, name, size, contentType }` | 201 (+ `Location`) |
| GET | `/api/files/:id` | Download a file (always `attachment`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`) | 200 |

### Response format

```jsonc
// success
{ "success": true, "message": "Tasks retrieved successfully", "data": [ ... ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 42, "totalPages": 5 } }

// error
{ "success": false, "message": "Validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [ { "field": "title", "message": "Title is required" } ] } }
```

| Status | When |
| --- | --- |
| 200 / 201 / 204 | OK / created / deleted |
| 400 `BAD_REQUEST` / `INVALID_JSON` | Malformed JSON, missing/invalid `x-organization-id`, invalid id or query parameter, upload without a `file` part |
| 404 `NOT_FOUND` / `ROUTE_NOT_FOUND` | Unknown task / file (or one of another organization) / route |
| 413 `PAYLOAD_TOO_LARGE` | Body over `JSON_BODY_LIMIT`, file over `FILE_MAX_SIZE_BYTES` |
| 422 `VALIDATION_ERROR` | Body failed validation (incl. the rules of the current form settings) |
| 429 `TOO_MANY_REQUESTS` | Rate limit exceeded |
| 500 `INTERNAL_SERVER_ERROR` | Unexpected error (details are logged, never returned) |

### Form settings (Part 2)

The task form is stored like a [bpmn.io form](https://demo.bpmn.io/form/s/start) (parity with the form-js 2.1.1 editor, `schemaVersion: 3`, see [`form-settings.schema.json`](form-settings.schema.json)): unlimited **rows of 1–2 components**, and groups / dynamic lists hold rows of their own (up to 3 nested levels, 500 components in total). Nothing is locked — until an organization saves its own form, `GET` returns the **task template** (Title, Description, Due Date + Priority, Status + Tags, Submit + Reset buttons), and every template component can be renamed, reconfigured or removed.

| Group | Components (`type`) |
| --- | --- |
| Input | `text`, `textarea`, `number`, `date`, `time`, `datetime`, `email`, `expression` (FEEL value), `filepicker` |
| Selection | `checkbox`, `checklist`, `radio`, `select`, `taglist` (options: static `{ label, value }`, input data `valuesKey` or FEEL `valuesExpression`) |
| Presentation | `textview`, `image`, `table`, `html`, `documentPreview`, `spacer`, `separator` (no value) |
| Containers | `group` (optional `path`), `dynamiclist` (`path` required), `iframe` (no value) |
| Action | `button` (`action`: `submit` / `reset`, no value) |

- **Keys & scopes** — every value component (input, selection, `expression`) has a `key`, unique **per scope**: the form itself, and one scope per group with a `path` or dynamic list (a group without `path` is only visual and shares its parent's scope; a container `path` counts as a key of its parent scope). Ids of rows and components are unique in the whole document. The keys `title`, `description`, `dueDate`, `priority`, `status` and `tags` are bound to the task properties (search, filters, sorting, inline status change): they are only allowed in the root scope, with compatible types (e.g. `status`: `select` / `radio`), and `status` / `priority` must use static options. Any other key is stored in `task.customFields[key]`.
- **Nested values** — a group with a path stores an object (`customFields.client = { name, tier }`), a dynamic list a list of objects (`customFields.checklist = [{ item, done }]`, ≤ 50 items), a file picker a list of file references returned by `POST /api/files` (1, or ≤ 10 with `multiple`), an expression any JSON value. Empty nested values are not stored. Errors point to the input: `customFields.client.name`, `customFields.checklist.1.item`.
- **Properties** — label, description, placeholder, default value, required / disabled / read-only (boolean or FEEL condition), searchable, prefix / suffix, min / max length, validation pattern (email, phone or a custom regex checked with `safe-regex2` against ReDoS), number min / max / decimals / increment, *disallow past dates*, 24h / time interval, file formats / multiple, text view text, HTML content, image source / alt text, table data source / columns / rows per page, document preview data source / max height, iFrame URL (https) / height / security attributes, group outline / vertical alignment, dynamic list repetitions / add-remove / collapse, button action — plus the common **Hide if** (`conditional.hide`), **Columns** (`layout.columns`: 2–16 of the 16-column grid; a row must fit, components without columns count as 2) and **Custom properties** (`properties`, ≤ 50 key/value pairs).
- **FEEL** — expressions (`"=..."`: hide conditions, expression values, options / table / document data sources, read-only conditions) are **evaluated in the browser** (bpmn.io FEEL via `feelin`). The API does not evaluate FEEL (`feelin` is ESM-only); it checks the shape: starts with `=`, has content, ≤ 500 characters. Text properties (label, text, content, ...) may also start with `=` or contain `{{ }}` templates. Because hide conditions are only known in the browser, **`required` is not enforced for a component that has a hide condition or sits in a container that has one** (the browser drops hidden values); type and format checks still apply to every value that is sent.
- **Tasks follow the settings** — `POST` / `PUT` / `PATCH /tasks` are validated against the current component tree: unknown keys (at any level), required values, option membership (e.g. a status that is not one of the configured options), patterns, ranges and nested values → `422`. Defaults are applied on create (root scope and groups, not dynamic list items); `PATCH` only validates the root values it changes (a provided group / list value is validated completely), so existing tasks stay editable after the form changes.
- **Files** — uploads are stored in Azure Blob Storage (Azurite locally) as `<organizationId>/<id>` with their content type and original name; another organization's id is a `404`. Downloads are always attachments with `Content-Security-Policy: sandbox`, so uploaded content never runs in the app origin.
- **Migration** — documents are upgraded when they are read: version 1 (renamed built-in labels + custom rows) → version 2 (rows of components) → version 3 (rows unchanged, the Submit + Reset row appended unless the form already has `row_actions`). They are written as version 3 on the next save.

## What was improved compared to the original functions

| Area | Before | After |
| --- | --- | --- |
| **Security** | SQL injection in `GetTasks` (`'${organizationId}'` interpolated into the query) | Parameterized queries only; sort fields whitelisted |
| | Hard-coded connection string in every function | Validated environment config (`.env` / app settings), secrets never in code |
| | `UpdateTask` patched *any* path from the body (could overwrite `id` / `organizationId`) | Strict zod schemas reject unknown fields (mass-assignment protection); tenant comes from the header, never from the body |
| | No input validation, raw SDK errors returned | 400/404/422 with field details; generic 500 without internals |
| | — | Helmet security headers, CORS allow-list, rate limiting, JSON body size limit, Cosmos system fields stripped |
| **Correctness** | `BulkDeleteTasks` used `forEach(async …)` → returned before deletions finished, errors lost | Every deletion awaited; response reports `deletedIds` / `notFoundIds` |
| | `GetTasks` used `fetchNext()` → silently returned only the first page | Real pagination (`OFFSET/LIMIT` + `COUNT`) with search, filters and sorting |
| | Missing task → `200` with empty body (get) or unhandled exception (delete/update); `POST` used for updates; `200` for create/delete | Proper verbs and status codes (201, 204, 404) |
| **Maintainability** | Copy-pasted `CosmosClient` per function, `strict: false` | One client, layered architecture, DI, `strict` TypeScript |
| | No tests, no lint | 288 Jest tests (~98% coverage), ESLint + Prettier, Swagger + Postman (36 requests) |

## Environment variables

See [`.env.example`](.env.example). Key ones: `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE_ID`, `COSMOS_ENABLE_ENDPOINT_DISCOVERY` (set `false` for the emulator behind a docker hostname), `AZURE_STORAGE_CONNECTION_STRING` (required; the example uses the public Azurite dev account), `AZURE_STORAGE_FILES_CONTAINER` (default `task-files`), `AZURE_STORAGE_AUTO_CREATE_CONTAINER` (default `true`), `FILE_MAX_SIZE_BYTES` (default 5 MB), `CORS_ORIGINS`, `RATE_LIMIT_*`, `TRUST_PROXY`.

> Authentication is out of scope for this test. The `x-organization-id` header stands in for the tenant claim that a real deployment would read from the user's token (e.g. Entra ID); the `organizationContext` middleware is the single place to change.
