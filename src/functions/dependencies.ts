import { getAppConfig } from '../config/env';
import { tasksContainer } from '../config/cosmos';
import { TaskController } from '../controllers/task.controller';
import { FormSettingsController } from '../controllers/form-settings.controller';
import { InMemoryFormSettingsRepository } from '../repositories/in-memory-form-settings.repository';
import { InMemoryTaskRepository } from '../repositories/in-memory-task.repository';
import { FormSettingsRepository } from '../repositories/form-settings.repository';
import { TaskRepository } from '../repositories/task.repository';
import { FormSettingsService } from '../services/form-settings.service';
import { TaskService } from '../services/task.service';

export function createFunctionDependencies() {
  const config = getAppConfig();
  if (config.storageMode === 'cosmos' && !tasksContainer) {
    throw new Error('Cosmos storage is enabled but the Cosmos container is not configured');
  }
  const cosmosContainer = tasksContainer;
  const taskRepository = config.storageMode === 'memory'
    ? new InMemoryTaskRepository()
    : new TaskRepository(cosmosContainer!);
  const formSettingsRepository = config.storageMode === 'memory'
    ? new InMemoryFormSettingsRepository()
    : new FormSettingsRepository(cosmosContainer!);

  return {
    config,
    taskController: new TaskController(new TaskService(taskRepository, formSettingsRepository)),
    formSettingsController: new FormSettingsController(new FormSettingsService(formSettingsRepository))
  };
}
