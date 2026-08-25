import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'
import { TaskRepository } from '@/repositories/task.repository'
import { TaskFormSettingService } from '@/services/task-form-setting.service'
import { TaskService } from '@/services/task.service'

const taskRepository = new TaskRepository(
  cosmosClient,
  cosmosConfig.databaseName,
  cosmosConfig.taskContainerName
)

const taskFormSettingRepository = new TaskFormSettingRepository(
  cosmosClient,
  cosmosConfig.databaseName,
  cosmosConfig.settingsContainerName
)

export const container = {
  taskService: new TaskService(taskRepository),
  taskFormSettingService: new TaskFormSettingService(taskFormSettingRepository)
}
