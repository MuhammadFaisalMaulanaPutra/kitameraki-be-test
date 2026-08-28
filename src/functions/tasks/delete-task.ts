import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import { TaskRepository } from '@/repositories/task.repository'
import { TaskService } from '@/services/task.service'
import { noContentResponse, requireRouteParameter } from '@/utils/http-request.util'
import { app } from '@azure/functions'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

export default httpHandler(async (request) => {
  await service.delete(
    requireRouteParameter(request, 'id'),
    requireRouteParameter(request, 'organizationId')
  )

  return noContentResponse()
})

app.http('DeleteTask', {
  route: 'organizations/{organizationId}/tasks/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
