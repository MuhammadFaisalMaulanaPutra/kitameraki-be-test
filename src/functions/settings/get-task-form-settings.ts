import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'
import { TaskFormSettingService } from '@/services/task-form-setting.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { app } from '@azure/functions'
import status from 'http-status'

const service = new TaskFormSettingService(
  new TaskFormSettingRepository(
    cosmosClient,
    cosmosConfig.databaseName,
    cosmosConfig.settingsContainerName
  )
)

export default httpHandler(async (request) => {
  const settings = await service.get(requireRouteParameter(request, 'organizationId'))

  return successResponse(status.OK, {
    message: 'Task form settings retrieved successfully.',
    data: settings
  })
})

app.http('GetTaskFormSettings', {
  route: 'organizations/{organizationId}/task-form-settings',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
