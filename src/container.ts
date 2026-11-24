import type { CosmosClient } from '@azure/cosmos';
import type { Express } from 'express';
import { createApp } from './app';
import type { Config } from './config/env';
import { FileController } from './controllers/file.controller';
import { FormSettingsController } from './controllers/form-settings.controller';
import { HealthController } from './controllers/health.controller';
import { TaskController } from './controllers/task.controller';
import { createFilesContainerClient, ensureFilesContainer } from './database/blob-storage';
import { createCosmosClient, ensureCosmosResources, getContainers } from './database/cosmos';
import { BlobFileRepository } from './repositories/blob/file.repository';
import { CosmosFormSettingsRepository } from './repositories/cosmos/form-settings.repository';
import { CosmosTaskRepository } from './repositories/cosmos/task.repository';
import { FileService } from './services/file.service';
import { FormSettingsService } from './services/form-settings.service';
import { TaskService } from './services/task.service';

export interface AppContainer {
  app: Express;
  cosmosClient: CosmosClient;
  services: { task: TaskService; formSettings: FormSettingsService; file: FileService };
  /**
   * Creates the Cosmos DB database/containers (`COSMOS_AUTO_CREATE_RESOURCES`) and the Blob Storage files
   * container (`AZURE_STORAGE_AUTO_CREATE_CONTAINER`) when enabled.
   */
  initialize(): Promise<void>;
  dispose(): void;
}

/**
 * Composition root: the only place that knows about concrete implementations.
 * Route -> Controller -> Service -> Repository interface -> Cosmos / Blob repository -> Cosmos DB / Blob Storage
 */
export function createContainer(config: Config): AppContainer {
  const cosmosClient = createCosmosClient(config.cosmos);
  const containers = getContainers(cosmosClient, config.cosmos);

  const taskRepository = new CosmosTaskRepository(containers.tasks);
  const formSettingsRepository = new CosmosFormSettingsRepository(containers.formSettings);
  const filesContainer = createFilesContainerClient(config.storage);
  const fileRepository = new BlobFileRepository(filesContainer);

  const formSettingsService = new FormSettingsService(formSettingsRepository);
  const taskService = new TaskService(taskRepository, formSettingsService);
  const fileService = new FileService(fileRepository);

  const app = createApp(config.app, {
    health: new HealthController(),
    task: new TaskController(taskService),
    formSettings: new FormSettingsController(formSettingsService),
    file: new FileController(fileService),
  });

  return {
    app,
    cosmosClient,
    services: { task: taskService, formSettings: formSettingsService, file: fileService },
    initialize: async () => {
      if (config.cosmos.autoCreateResources) await ensureCosmosResources(cosmosClient, config.cosmos);
      if (config.storage.autoCreateContainer) await ensureFilesContainer(filesContainer);
    },
    dispose: () => cosmosClient.dispose(),
  };
}
