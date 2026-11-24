import { Router } from 'express';
import type { FormSettingsController } from '../controllers/form-settings.controller';

export function createFormSettingsRoutes(controller: FormSettingsController): Router {
  const router = Router();

  router.get('/', controller.get);
  router.put('/', controller.update);

  return router;
}
