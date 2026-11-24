import { Router } from 'express';
import type { FileController } from '../controllers/file.controller';
import { createFileUpload } from '../middlewares/file-upload.middleware';

export interface FileRoutesOptions {
  maxFileSizeBytes: number;
}

export function createFileRoutes(controller: FileController, { maxFileSizeBytes }: FileRoutesOptions): Router {
  const router = Router();

  router.post('/', createFileUpload(maxFileSizeBytes), controller.upload);
  router.get('/:id', controller.download);

  return router;
}
