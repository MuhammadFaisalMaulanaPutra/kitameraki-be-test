import type { TaskEntity } from '@/models/entities/task.entity'
import { BaseRepository } from '@/repositories/base.repository'
import type { SqlParameter, SqlQuerySpec } from '@azure/cosmos'

export interface TaskSearchCriteria {
  organizationId: string
  status?: string
  priority?: string
  search?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
  continuationToken?: string
}

export interface TaskQueryResult {
  items: TaskEntity[]
  continuationToken?: string
  totalCount: number
  requestCharge: number
}

export class TaskRepository extends BaseRepository<TaskEntity> {
  async search(criteria: TaskSearchCriteria): Promise<TaskQueryResult> {
    const sortBy = criteria.sortBy || 'createdAt'
    const sortOrder = (criteria.sortOrder || 'desc').toUpperCase()

    const page = criteria.page && criteria.page > 0 ? criteria.page : 1
    const pageSize = criteria.pageSize || 10
    const offset = (page - 1) * pageSize

    const conditions = ['c.organizationId = @organizationId']
    const parameters: SqlParameter[] = [{ name: '@organizationId', value: criteria.organizationId }]

    if (criteria.status) {
      conditions.push('c.status = @status')
      parameters.push({ name: '@status', value: criteria.status })
    }

    if (criteria.priority) {
      conditions.push('c.priority = @priority')
      parameters.push({ name: '@priority', value: criteria.priority })
    }

    if (criteria.search) {
      conditions.push('CONTAINS(LOWER(c.title), LOWER(@search))')
      parameters.push({ name: '@search', value: criteria.search })
    }

    const whereClause = conditions.join(' AND ')

    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c.${sortBy} ${sortOrder} OFFSET @offset LIMIT @limit`,
      parameters: [
        ...parameters,
        { name: '@offset', value: offset },
        { name: '@limit', value: pageSize }
      ]
    }

    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
      parameters: [...parameters]
    }

    const [response, countResponse] = await Promise.all([
      this.container.items.query<TaskEntity>(query).fetchAll(),
      this.container.items.query<number>(countQuery).fetchAll()
    ])

    const totalCharge = (response.requestCharge ?? 0) + (countResponse.requestCharge ?? 0)

    return {
      items: response.resources ?? [],
      continuationToken: undefined,
      totalCount: countResponse.resources?.[0] ?? 0,
      requestCharge: totalCharge
    }
  }
}
