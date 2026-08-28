import { getAppConfig } from '../config/appConfig';
import { CosmosFormSettingsRepository } from './cosmos/CosmosFormSettingsRepository';
import { CosmosTaskRepository } from './cosmos/CosmosTaskRepository';
import { FormSettingsRepository, TaskRepository } from './contracts';
import { JsonFormSettingsRepository } from './json/JsonFormSettingsRepository';
import { JsonTaskRepository } from './json/JsonTaskRepository';

let taskRepository: TaskRepository | undefined;
let formSettingsRepository: FormSettingsRepository | undefined;

export function getTaskRepository(): TaskRepository {
  if (taskRepository) {
    return taskRepository;
  }

  const config = getAppConfig();
  taskRepository =
    config.storageProvider === 'json'
      ? new JsonTaskRepository(config.localDataDirectory)
      : new CosmosTaskRepository();
  return taskRepository;
}

export function getFormSettingsRepository(): FormSettingsRepository {
  if (formSettingsRepository) {
    return formSettingsRepository;
  }

  const config = getAppConfig();
  formSettingsRepository =
    config.storageProvider === 'json'
      ? new JsonFormSettingsRepository(config.localDataDirectory)
      : new CosmosFormSettingsRepository();
  return formSettingsRepository;
}
