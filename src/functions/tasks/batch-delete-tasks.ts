import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import ajvInstance from '@/config/validator.config'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { validateBody } from '@/middleware/validate.middleware'
import type { BatchDeleteTasksSchema } from '@/models/generated/batch-delete-tasks'
import { TaskRepository } from '@/repositories/task.repository'
import batchDeleteTasksSchemaJson from '@/schemas/batch-delete-tasks.schema.json'
import { TaskService } from '@/services/task.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { type HttpResponseInit, type InvocationContext, app } from '@azure/functions'
import status from 'http-status'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

const validateBatchDelete = ajvInstance.compile<BatchDeleteTasksSchema>(batchDeleteTasksSchemaJson)

const wrappedHandler = validateBody<BatchDeleteTasksSchema>(
  validateBatchDelete,
  async (request, _context: InvocationContext, body): Promise<HttpResponseInit> => {
    const result = await service.batchDelete(body, requireRouteParameter(request, 'orgId'))

    return successResponse(status.OK, {
      message: 'Tasks deleted successfully',
      data: result
    })
  }
)

export default httpHandler(wrappedHandler)

app.http('BatchDeleteTasks', {
  route: 'organizations/{orgId}/tasks/batch-delete',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
