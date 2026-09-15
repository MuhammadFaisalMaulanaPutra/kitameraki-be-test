# KitaMeraki Task API

An Azure Functions v4 and TypeScript REST API backed by Azure Cosmos DB for NoSQL. It stores tasks and the workspace-wide task form configuration used by the frontend.

## Prerequisites

The recommended local workflow only requires:

- Docker with Docker Compose
- GNU Make

Allocate at least 4 GiB of memory to the Docker VM (6 GiB is recommended). On Apple Silicon, Cosmos DB and Azurite run natively, while the official Azure Functions Node 22 image runs as `linux/amd64`, so the complete stack needs more memory than Docker's 2 GiB default in tools such as Colima.

For example, configure Colima before setup:

```sh
colima stop
colima start --memory 4
```

Changing the Colima VM restarts all containers managed by that VM. Docker Desktop users can change the memory limit in Docker Desktop settings instead. `make setup` checks this limit before pulling or building images.

Node.js 22, npm, and [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) are only required when running the API directly on the host or when running `make check`.

## Cosmos DB setup

Docker Compose creates database `TaskApp` and two containers automatically on the first start:

| Container      | Partition key     |
| -------------- | ----------------- |
| `Tasks`        | `/organizationId` |
| `FormSettings` | `/organizationId` |

Container and database names may be overridden through app settings. The Compose initialization is local-development infrastructure; deployed Azure resources remain intentionally provisioned outside the request runtime so the Function App only needs data-plane permissions.

For Azure, the preferred connection is managed identity:

- Set `COSMOS_ENDPOINT` to the Cosmos account endpoint.
- Do not set `COSMOS_CONNECTION_STRING`.
- Grant the Function App identity a Cosmos DB Built-in Data Contributor role scoped to the required account/database.

For local development outside Docker, either sign in with Azure CLI and set `COSMOS_ENDPOINT`, or use the emulator connection string from `local.settings.example.json`.

## Local setup

Set up the images and start the complete stack in the foreground:

```sh
make setup
make run
```

For everyday use, start the stack in the background:

```sh
make start
make status
```

The local services are available at:

| Service                  | URL                           |
| ------------------------ | ----------------------------- |
| REST API                 | `http://localhost:7071/api`   |
| Cosmos DB endpoint       | `http://localhost:8081`       |
| Cosmos DB health         | `http://localhost:8080/ready` |
| Cosmos Data Explorer     | `http://localhost:1234`       |
| Azurite Blob/Queue/Table | `10000` / `10001` / `10002`   |

Open Cosmos Data Explorer to inspect `TaskApp/Tasks` and `TaskApp/FormSettings`. The frontend organization ID must equal the backend `ORGANIZATION_ID`.

Useful lifecycle commands:

```sh
make logs-api
make restart
make stop
```

`make stop` preserves emulator data. `make reset` asks for confirmation before deleting the Cosmos DB and Azurite volumes. Run `make help` for all available targets.

The connection strings checked into the Compose configuration are the publicly documented, local-only emulator credentials. Never commit `local.settings.json`, real Azure connection strings, production account keys, or frontend-visible Function keys.

### Run the API on the host

To run infrastructure in Docker while keeping the Functions host on macOS:

```sh
docker compose up --detach cosmos azurite
npm install
cp local.settings.example.json local.settings.json
npm start
```

This path requires Node.js 22 and Azure Functions Core Tools v4. The Compose API uses Docker service hostnames internally, while `local.settings.json` uses `localhost` from the host.

## Configuration

| Setting                               | Required              | Default                 | Purpose                                             |
| ------------------------------------- | --------------------- | ----------------------- | --------------------------------------------------- |
| `AZURE_FUNCTIONS_ENVIRONMENT`         | No                    | `Development`           | Enables fail-closed production configuration checks |
| `ORGANIZATION_ID`                     | Yes                   | —                       | Single organization accepted by this assignment API |
| `COSMOS_ENDPOINT`                     | One Cosmos credential | —                       | Endpoint used with `DefaultAzureCredential`         |
| `COSMOS_CONNECTION_STRING`            | One Cosmos credential | —                       | Local development fallback                          |
| `COSMOS_DATABASE_NAME`                | No                    | `TaskApp`               | Database name                                       |
| `COSMOS_TASKS_CONTAINER_NAME`         | No                    | `Tasks`                 | Task container                                      |
| `COSMOS_FORM_SETTINGS_CONTAINER_NAME` | No                    | `FormSettings`          | Settings container                                  |
| `ALLOWED_ORIGIN`                      | No                    | `http://localhost:5173` | Exact browser origin allowed by API responses       |
| `MAX_REQUEST_BODY_BYTES`              | No                    | `262144`                | Maximum JSON request body (256 KiB)                 |
| `SLOW_COSMOS_OPERATION_MS`            | No                    | `250`                   | Threshold for slow Cosmos operation warnings        |

In Azure, configure CORS at the Function App platform level as well. Set `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true` so registration errors are visible in Application Insights.

When `AZURE_FUNCTIONS_ENVIRONMENT=Production`, startup rejects a connection string, a non-HTTPS `COSMOS_ENDPOINT`, or a non-HTTPS `ALLOWED_ORIGIN`. Production should use managed identity and app settings or Key Vault references; account keys remain a local/emulator-only fallback.

## REST API

Every non-preflight request requires:

```text
X-Organization-Id: <configured organization UUID>
```

| Method   | Route                                       | Result                                |
| -------- | ------------------------------------------- | ------------------------------------- |
| `GET`    | `/api/tasks?page=1&pageSize=10&q=&filters=` | Paginated tasks and workspace summary |
| `POST`   | `/api/tasks`                                | Create task (`201`)                   |
| `GET`    | `/api/tasks/{id}`                           | Read task                             |
| `PATCH`  | `/api/tasks/{id}`                           | Update mutable task fields            |
| `DELETE` | `/api/tasks/{id}`                           | Delete task (`204`)                   |
| `GET`    | `/api/form-settings`                        | Current or default form settings      |
| `PUT`    | `/api/form-settings`                        | Atomically save settings              |

`filters` is a URL-encoded JSON array. Text filters use `contains`, status and priority use `equals`, and date fields use `between` with optional `from`/`to` ISO values. The server resolves field IDs against active settings and parameterizes every value before querying Cosmos.

At most 20 filters are accepted. Search is case-insensitive across title, description, tags, and active custom text/email fields. Pagination uses `page` (maximum 10,000) and `pageSize` (maximum 50); both must be safe positive integers. Pages use deterministic `ORDER BY c._ts DESC, c.id ASC`. Task responses are mapped explicitly and never expose Cosmos metadata such as `_rid`, `_etag`, `_attachments`, or `_ts`.

When `GET /form-settings` returns an `ETag`, send it as `If-Match` on `PUT`. A stale or missing ETag for an existing document returns `409 settings_conflict`.

Built-in fields may be relabeled but cannot be removed or structurally changed. Custom fields support `text`, `date`, `datetime`, and `email`; their UUID-based IDs remain stable across rename/reorder operations. Each layout row contains one or two fields, with no business limit on the number of rows beyond the 256 KiB request limit. Removed custom values remain in task storage and become visible again if the same field ID is reactivated.

Errors use this envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request is invalid.",
    "details": {}
  }
}
```

## Quality checks

```sh
npm ci
make check
```

The main gate runs formatting verification, lint, strict type-checking, unit coverage, build, and a production dependency audit. Coverage thresholds are 85% for statements, lines, and functions, and 80% for branches.

Run the Cosmos integration and Docker HTTP acceptance suites separately:

```sh
make test-integration
make test-smoke
make stop
```

Integration tests create and delete an isolated temporary Cosmos database. The smoke suite uses the running Compose API. `make test-smoke` waits for the business-route healthcheck before testing.

Unit tests use repository fakes and do not require Cosmos DB. A full local acceptance test requires the containers above.

## Architecture and performance

The composition root creates one `CosmosClient`, one repository instance per container, and shared services. HTTP parsing/authorization, domain validation, services, explicit DTO mapping, and Cosmos persistence remain separate. Task updates use Cosmos ETags internally and retry once so concurrent patches do not silently overwrite unrelated changes.

HTTP Functions are grouped by resource in `src/functions/form-settings/` and `src/functions/tasks/`, with one registration per kebab-case file. The `package.json` `main` glob loads both subfolders after build. Internal source imports can use `@/` (mapped to `src/`); these Function files use it, while existing imports elsewhere remain unchanged. `npm run build` rewrites aliases in `dist/` to relative CommonJS paths with `tsc-alias`, so the Azure Functions runtime needs no alias loader. `npm run watch` runs alias rewriting after each successful TypeScript watch compilation to keep emitted JavaScript loadable.

Point operations always include the organization partition key. List queries use an explicit projection and issue the page query and a combined filtered-count/summary aggregate in parallel. Together with the uncached form-settings point read, a list request uses at most three Cosmos operations so settings changes are immediately visible. Structured request logs include invocation ID, status, latency, operation count, and request charge without recording payloads or credentials.

The task container policy includes a composite index for `_ts DESC, id ASC`. Local provisioning compares normalized policies and updates them idempotently. For an existing Azure container, apply the same `TASKS_INDEXING_POLICY` through the environment's approved IaC or migration process, monitor the Cosmos index transformation progress until it reaches 100%, and only then release code using the deterministic order. This avoids transient query failures while the composite index is being built.

Every API response is non-cacheable and includes `X-Request-Id` (the Azure Functions invocation ID), strict CORS, content-type sniffing protection, frame protection, referrer and permissions policies, and a restrictive API CSP. HSTS is configured for HTTPS hosts; the local HTTP Functions host may omit it. `ETag` and `X-Request-Id` are exposed to the allowed browser origin. Logs never include request bodies, credentials, or internal exception messages.

## Security boundary

This assignment intentionally has no user authentication. `X-Organization-Id` is validated tenant routing, not proof of identity. Before any public deployment, place the API behind Microsoft Entra ID, APIM, or another identity layer and derive the authorized organization from verified claims rather than a client-provided header.
