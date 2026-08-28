import { getFormSettingsRepository, getTaskRepository } from '../repositories/repositoryFactory';
import { FormSettingsService } from './FormSettingsService';
import { TaskService } from './TaskService';

let taskService: TaskService | undefined;
let formSettingsService: FormSettingsService | undefined;

export function getTaskService(): TaskService {
  taskService ??= new TaskService(getTaskRepository(), getFormSettingsRepository());
  return taskService;
}

export function getFormSettingsService(): FormSettingsService {
  formSettingsService ??= new FormSettingsService(getFormSettingsRepository());
  return formSettingsService;
}
