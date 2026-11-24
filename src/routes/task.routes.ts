import { Router } from 'express';
import type { TaskController } from '../controllers/task.controller';

export function createTaskRoutes(controller: TaskController): Router {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.post('/bulk-delete', controller.bulkDelete);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.replace);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
