import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { HTTP_STATUS } from '@/constants/http-status'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'
import { TaskFormSettingService } from '@/services/task-form-setting.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { app } from '@azure/functions'

const service = new TaskFormSettingService(
  new TaskFormSettingRepository(
    cosmosClient,
    cosmosConfig.databaseName,
    cosmosConfig.settingsContainerName
  )
)

export default httpHandler(async (request) => {
  const settings = await service.get(requireRouteParameter(request, 'orgId'))
  return successResponse(HTTP_STATUS.OK, settings)
})

app.http('GetTaskFormSettings', {
  route: 'organizations/{orgId}/task-form-settings',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
