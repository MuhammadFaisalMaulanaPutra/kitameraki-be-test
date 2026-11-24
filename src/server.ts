import { loadConfig } from './config/env';
import { createContainer } from './container';
import { logger } from './utils/logger';
import { retry } from './utils/retry';

/** Standalone HTTP server (local development / Docker). Azure Functions uses `src/functions/api.ts` instead. */
async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const container = createContainer(config);

  await retry(() => container.initialize(), {
    retries: 20,
    delayMs: 3000,
    label: 'Cosmos DB / Blob Storage initialization',
  });

  const server = container.app.listen(config.app.port, () => {
    logger.info(`API listening on http://localhost:${config.app.port}/api`);
    logger.info(`Swagger UI available at http://localhost:${config.app.port}/api/docs`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      container.dispose();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start the API', error);
  process.exit(1);
});
