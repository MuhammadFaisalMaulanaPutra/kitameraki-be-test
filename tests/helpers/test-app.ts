import type { Express } from 'express';
import { createApp } from '../../src/app';
import type { AppConfig } from '../../src/config/env';
import { FileController } from '../../src/controllers/file.controller';
import { FormSettingsController } from '../../src/controllers/form-settings.controller';
import { HealthController } from '../../src/controllers/health.controller';
import { TaskController } from '../../src/controllers/task.controller';
import { FileService } from '../../src/services/file.service';
import { FormSettingsService } from '../../src/services/form-settings.service';
import { TaskService } from '../../src/services/task.service';
import {
  InMemoryFileRepository,
  InMemoryFormSettingsRepository,
  InMemoryTaskRepository,
} from './in-memory-repositories';

export const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
export const OTHER_ORG_ID = '0b6f6a5e-2c1d-4e3f-8a9b-1c2d3e4f5a6b';
export const MISSING_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

export const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  trustProxy: 0,
  corsOrigins: ['http://localhost:3000'],
  rateLimit: { windowMs: 60_000, max: 1_000 },
  jsonBodyLimit: '100kb',
  fileMaxSizeBytes: 5_242_880,
};

export interface TestContext {
  app: Express;
  taskRepository: InMemoryTaskRepository;
  formSettingsRepository: InMemoryFormSettingsRepository;
  fileRepository: InMemoryFileRepository;
}

/** Full Express app wired with in-memory repositories (no database or storage account needed). */
export function createTestApp(config: Partial<AppConfig> = {}): TestContext {
  const taskRepository = new InMemoryTaskRepository();
  const formSettingsRepository = new InMemoryFormSettingsRepository();
  const fileRepository = new InMemoryFileRepository();
  const formSettingsService = new FormSettingsService(formSettingsRepository);
  const taskService = new TaskService(taskRepository, formSettingsService);

  const app = createApp(
    { ...testConfig, ...config },
    {
      health: new HealthController(),
      task: new TaskController(taskService),
      formSettings: new FormSettingsController(formSettingsService),
      file: new FileController(new FileService(fileRepository)),
    },
  );

  return { app, taskRepository, formSettingsRepository, fileRepository };
}
