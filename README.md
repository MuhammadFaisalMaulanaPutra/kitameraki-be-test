# kitameraki-be-test

Azure Functions (TypeScript) backend for task and settings APIs.

## Prerequisites

- Node.js 22+
- npm
- Azure Functions Core Tools v4 (`func` command)
- (Recommended) Azurite for local storage when using `AzureWebJobsStorage=UseDevelopmentStorage=true`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment values in `local.settings.json`:

- `AzureWebJobsStorage`
- `FUNCTIONS_WORKER_RUNTIME`
- `COSMOS_DB_CONNECTION_STRING` (recommended)
- `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` (optional alternative to connection string)
- `COSMOS_DB_DATABASE`
- `COSMOS_DB_CONTAINER`

Note: Do not commit real secrets to source control.

## Run Locally

Start the Functions host:

```bash
npm start
```

This runs:

1. `npm run clean`
2. `npm run build`
3. `func start`

Default local URL:

```text
http://localhost:7071
```

## Useful Scripts

- `npm run build` - Compile TypeScript once
- `npm run watch` - Compile TypeScript in watch mode
- `npm run clean` - Remove `dist`
- `npm start` - Clean, build, and start Azure Functions host

## Quick API Smoke Tests

Once running, try:

```bash
# Get all tasks
curl "http://localhost:7071/api/GetTasks?organizationId=demo-org"

# Get one task
curl "http://localhost:7071/api/GetTask?id=<task-id>&organizationId=demo-org"

# Create a task
curl -X POST "http://localhost:7071/api/InsertTask?organizationId=demo-org" \
	-H "Content-Type: application/json" \
	-d '{"title":"Sample Task"}'

# Settings endpoint
curl "http://localhost:7071/api/settings?organizationId=demo-org"
```
