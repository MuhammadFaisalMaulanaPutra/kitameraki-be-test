import { cosmosClient, cosmosConfig } from '@/config/cosmos.config'
import ajv from '@/config/validator.config'
import type { ParamViolation } from '@/errors/validation.error'
import { ValidationError } from '@/errors/validation.error'
import { httpHandler } from '@/middleware/http-handler.wrapper'
import type { TaskQuerySchema } from '@/models/generated/task-query'
import { TaskRepository } from '@/repositories/task.repository'
import taskQuerySchemaJson from '@/schemas/task-query.schema.json'
import { TaskService } from '@/services/task.service'
import { requireRouteParameter, successResponse } from '@/utils/http-request.util'
import { calculatePagination } from '@/utils/pagination.util'
import { app } from '@azure/functions'
import type { ErrorObject } from 'ajv'
import status from 'http-status'

const service = new TaskService(
  new TaskRepository(cosmosClient, cosmosConfig.databaseName, cosmosConfig.taskContainerName)
)

const validateQuery = ajv.compile<TaskQuerySchema>(taskQuerySchemaJson)

// TODO: fix this query parse
function parseQuery(rawQuery: URLSearchParams): TaskQuerySchema {
  const raw: Record<string, string> = {}
  for (const [key, value] of rawQuery.entries()) if (value) raw[key] = value
  if (!validateQuery(raw)) throw new ValidationError(mapAjvErrors(validateQuery.errors))
  return raw as unknown as TaskQuerySchema
}

function mapAjvErrors(errors: readonly ErrorObject[] | null | undefined): ParamViolation[] {
  return (errors ?? []).map((error) => ({
    field: error.instancePath
      ? error.instancePath.replace(/^\//, '').replaceAll('/', '.')
      : error.params.missingProperty || 'root',
    message: error.message ?? 'Invalid value'
  }))
}

export default httpHandler(async (request) => {
  const organizationId = requireRouteParameter(request, 'orgId')
  const query = parseQuery(request.query)
  const result = await service.list(query, organizationId)

  return successResponse(status.OK, {
    message: 'Task retrieved successfully',
    data: result.items,
    meta: calculatePagination(query.page, query.pageSize, result.totalCount)
  })
})

app.http('ListTasks', {
  route: 'organizations/{orgId}/tasks',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: module.exports.default
})
