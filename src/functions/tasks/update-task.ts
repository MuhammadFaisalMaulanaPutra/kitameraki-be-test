import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import ajvInstance from '@/config/validator.config'
import { HTTP_STATUS } from '@/constants/http-status'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { validateBody } from '@/middleware/validate.middleware'
import type { PatchTaskSchema } from '@/models/generated/patch-task'
import { TaskRepository } from '@/repositories/task.repository'
import patchTaskSchemaJson from '@/schemas/patch-task.schema.json'
import { TaskService } from '@/services/task.service'
import { requireIfMatch, requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { type HttpResponseInit, type InvocationContext, app } from '@azure/functions'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

const validatePatchTask = ajvInstance.compile<PatchTaskSchema>(patchTaskSchemaJson)

const wrappedHandler = validateBody<PatchTaskSchema>(
  validatePatchTask,
  async (request, _context: InvocationContext, body): Promise<HttpResponseInit> => {
    const task = await service.update(
      requireRouteParameter(request, 'id'),
      body,
      requireIfMatch(request),
      requireRouteParameter(request, 'orgId')
    )
    return successResponse(HTTP_STATUS.OK, task)
  }
)

export default httpHandler(wrappedHandler)

app.http('UpdateTask', {
  route: 'organizations/{orgId}/tasks/{id}',
  methods: ['PATCH'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
