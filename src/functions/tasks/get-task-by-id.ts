import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { TaskRepository } from '@/repositories/task.repository'
import { TaskService } from '@/services/task.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { app } from '@azure/functions'
import status from 'http-status'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

export default httpHandler(async (request) => {
  const task = await service.getById(
    requireRouteParameter(request, 'id'),
    requireRouteParameter(request, 'orgId')
  )

  return successResponse(status.OK, {
    message: 'Task retrieved successfully',
    data: task
  })
})

app.http('GetTaskById', {
  route: 'organizations/{orgId}/tasks/{id}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
