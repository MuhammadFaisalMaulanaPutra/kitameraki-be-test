import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import ajvInstance from '@/config/validator.config'
import { HTTP_STATUS } from '@/constants/http-status'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { validateBody } from '@/middleware/validate.middleware'
import type { CreateTaskSchema } from '@/models/generated/create-task'
import { TaskRepository } from '@/repositories/task.repository'
import createTaskSchemaJson from '@/schemas/create-task.schema.json'
import { TaskService } from '@/services/task.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { type HttpResponseInit, app } from '@azure/functions'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

const validateCreateTask = ajvInstance.compile<CreateTaskSchema>(createTaskSchemaJson)

const wrappedHandler = validateBody<CreateTaskSchema>(
  validateCreateTask,
  async (request, _context, body): Promise<HttpResponseInit> => {
    const task = await service.create(body, requireRouteParameter(request, 'orgId'))
    return successResponse(HTTP_STATUS.CREATED, task)
  }
)

export default httpHandler(wrappedHandler)

app.http('CreateTask', {
  route: 'organizations/{orgId}/tasks',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
