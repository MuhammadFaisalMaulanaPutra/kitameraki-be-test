import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import type { AppConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware';
import { ORGANIZATION_HEADER } from './middlewares/organization-context.middleware';
import { createRateLimiter } from './middlewares/rate-limit.middleware';
import { type Controllers, createApiRouter } from './routes';

/** Builds the Express application. Dependencies are injected so tests can use in-memory repositories. */
export function createApp(config: AppConfig, controllers: Controllers): Express {
  const app = express();

  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', ORGANIZATION_HEADER],
      exposedHeaders: ['Location', 'Content-Disposition'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));

  if (config.nodeEnv !== 'test') {
    app.use(
      morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', {
        skip: (req) => req.url === '/api/health',
      }),
    );
  }

  app.use(
    '/api',
    createRateLimiter(config.rateLimit.windowMs, config.rateLimit.max),
    createApiRouter(controllers, { maxFileSizeBytes: config.fileMaxSizeBytes }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
