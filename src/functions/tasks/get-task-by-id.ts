import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { HTTP_STATUS } from '@/constants/http-status'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { TaskRepository } from '@/repositories/task.repository'
import { TaskService } from '@/services/task.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { app } from '@azure/functions'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

export default httpHandler(async (request) => {
  const task = await service.getById(
    requireRouteParameter(request, 'id'),
    requireRouteParameter(request, 'orgId')
  )
  return successResponse(HTTP_STATUS.OK, task)
})

app.http('GetTaskById', {
  route: 'organizations/{orgId}/tasks/{id}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
