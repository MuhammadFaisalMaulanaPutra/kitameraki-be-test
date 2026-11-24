import { app } from '@azure/functions';
import { createAzureHttpHandler } from '../adapters/azure-functions.adapter';
import { loadConfig } from '../config/env';
import { type AppContainer, createContainer } from '../container';

let containerPromise: Promise<AppContainer> | undefined;

/** Built once per Function App instance (cold start) and reused by every invocation. */
function getContainer(): Promise<AppContainer> {
  containerPromise ??= (async () => {
    const container = createContainer(loadConfig());
    await container.initialize();
    return container;
  })().catch((error) => {
    containerPromise = undefined;
    throw error;
  });
  return containerPromise;
}

// host.json sets `routePrefix` to "" so this catch-all receives `/api/...` exactly like the Express server.
app.http('api', {
  route: '{*path}',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  handler: createAzureHttpHandler(async () => (await getContainer()).app),
});
