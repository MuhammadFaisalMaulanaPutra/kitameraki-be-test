/**
 * @file index.ts
 * @description Entry point for the Azure Functions application.
 *
 * This file bootstraps the Azure Functions v4 runtime and enables HTTP
 * streaming, which allows the host to stream large response bodies rather
 * than buffering them entirely in memory — important for paginated list
 * endpoints that may return many items.
 *
 * All function registrations are performed via side-effects when their
 * respective modules are imported (each module calls `app.http(...)` at
 * module level). The `main` field in package.json points to this file and
 * the function modules under `dist/src/functions/*.js`, so the Azure Functions
 * host discovers them automatically at startup.
 */

import { app } from "@azure/functions";

app.setup({
  enableHttpStream: true,
});
