# Repository Guidelines

## Project Structure & Module Organization
- `src/functions/` — Azure Functions v4 handlers: `tasks/` (create, list, get, update, delete, `batch-delete`) and `settings/` (`get`/`put-task-form-settings`).
- `src/services/` and `src/repositories/` — business logic and Cosmos DB access; handlers stay thin.
- `src/schemas/*.schema.json` — JSON Schema source of truth; generates `src/models/generated/*.d.ts`.
- `src/models/`, `src/config/`, `src/middleware/`, `src/utils/`, `src/errors/` — entities, config, validation, helpers.
- `scripts/generate-types.mjs` generates types; `dist/` is build output (do not edit).

## Build, Test, and Development Commands
- `docker compose up -d` — start local Cosmos DB emulator.
- `npm install` — install dependencies.
- `npm run build` — clean, run `typegen`, compile with `tsc` + `tsc-alias`, copy schemas to `dist/`.
- `npm run dev` — watch + `func start` (requires Azure Functions Core Tools).
- `npm run typegen` — compile schemas to `src/models/generated` via `json-schema-to-typescript`.
- `npm run lint` / `npm run lint:fix` — check / fix with Biome.
- `npm test` — placeholder (`echo "No tests yet..."`).

## Coding Style & Naming Conventions
- 2-space indent, LF, single quotes, no semicolons, no trailing commas, 100-char line width — enforced by Biome (`biome.json`) and `.editorconfig`.
- TypeScript `strict` (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`). Use `@/*` alias for `src/*`.
- `kebab-case` files (`create-task.ts`), `PascalCase` classes, `camelCase` vars/functions, `UPPER_SNAKE` env vars.
- Imports auto-organized; run `npm run lint:fix` before push. Never edit `src/models/generated/**`.

## Testing Guidelines
- No framework configured yet. Add tests as `*.spec.ts` or `*.test.ts` (excluded in `tsconfig.json`) or under `src/__tests__/`.
- Example: `src/services/task.service.spec.ts` with mocked repositories.
- Verify with `npm run lint && npm run build` until a runner is added.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `refactor:` + optional scope (e.g., `feat(task-api): initialized project`, `refactor: update organizationId usage`). Use imperative, lowercase subject.
- PRs: description, linked issue (`Closes #123`), reproduction/verification steps, and schema impact. Note `If-Match`/`ETag` changes. Ensure lint and build pass.
- Do not commit `dist/`, `node_modules/`, or secrets.

## Security & Configuration Tips
- Copy `local.settings.json.example` → `local.settings.json`; configure Cosmos DB via env vars in `src/config/cosmos.config.ts`. Never commit secrets.
- Validate inputs via Ajv schemas in `src/schemas` and `validate.middleware.ts`.

## Architecture Overview
- Flow: HTTP → `http-handler.wrapper` → `validate.middleware` (Ajv) → service → repository → Cosmos DB (partitioned by `/organizationId`, always pass partition key). `PATCH` requires `If-Match`; `PUT task-form-settings` uses `If-Match` when resource exists.
