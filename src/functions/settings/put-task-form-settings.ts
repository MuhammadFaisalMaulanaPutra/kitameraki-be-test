import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import ajvInstance from '@/config/validator.config'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { validateBody } from '@/middleware/validate.middleware'
import type { PutTaskFormSettingSchema } from '@/models/generated/put-task-form-setting'
import { TaskFormSettingRepository } from '@/repositories/task-form-setting.repository'
import putTaskFormSettingSchemaJson from '@/schemas/put-task-form-setting.schema.json'
import { TaskFormSettingService } from '@/services/task-form-setting.service'
import { requireIfMatch, requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { type HttpResponseInit, type InvocationContext, app } from '@azure/functions'
import status from 'http-status'

const service = new TaskFormSettingService(
  new TaskFormSettingRepository(
    cosmosClient,
    cosmosConfig.databaseName,
    cosmosConfig.settingsContainerName
  )
)

const validatePutSettings = ajvInstance.compile<PutTaskFormSettingSchema>(
  putTaskFormSettingSchemaJson
)

const wrappedHandler = validateBody<PutTaskFormSettingSchema>(
  validatePutSettings,
  async (request, _context: InvocationContext, body): Promise<HttpResponseInit> => {
    const settings = await service.put(
      body,
      requireIfMatch(request),
      requireRouteParameter(request, 'orgId')
    )

    return successResponse(status.OK, {
      message: 'Task form settings updated successfully.',
      data: settings
    })
  }
)

export default httpHandler(wrappedHandler)

app.http('PutTaskFormSettings', {
  route: 'organizations/{orgId}/task-form-settings',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
