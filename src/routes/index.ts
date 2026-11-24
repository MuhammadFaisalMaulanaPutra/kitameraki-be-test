import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { FileController } from '../controllers/file.controller';
import type { FormSettingsController } from '../controllers/form-settings.controller';
import type { HealthController } from '../controllers/health.controller';
import type { TaskController } from '../controllers/task.controller';
import { openApiDocument } from '../docs/openapi';
import { organizationContext } from '../middlewares/organization-context.middleware';
import { createFileRoutes, type FileRoutesOptions } from './file.routes';
import { createFormSettingsRoutes } from './form-settings.routes';
import { createTaskRoutes } from './task.routes';

export interface Controllers {
  health: HealthController;
  task: TaskController;
  formSettings: FormSettingsController;
  file: FileController;
}

export type ApiRouterOptions = FileRoutesOptions;

/** Mounted under `/api`. */
export function createApiRouter(controllers: Controllers, options: ApiRouterOptions): Router {
  const router = Router();

  router.get('/health', controllers.health.check);

  router.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'Task Management API Docs' }),
  );

  router.use('/tasks', organizationContext, createTaskRoutes(controllers.task));
  router.use('/form-settings', organizationContext, createFormSettingsRoutes(controllers.formSettings));
  router.use('/files', organizationContext, createFileRoutes(controllers.file, options));

  return router;
}
