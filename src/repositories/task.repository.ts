import type { TaskEntity } from '@/models/entities/task.entity'
import { BaseRepository } from '@/repositories/base.repository'
import type { FeedOptions, SqlParameter, SqlQuerySpec } from '@azure/cosmos'

export interface TaskSearchCriteria {
  orgId: string
  status?: string
  priority?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  pageSize: number
  continuationToken?: string
}

export interface TaskQueryResult {
  items: TaskEntity[]
  continuationToken?: string
  requestCharge: number
}

export class TaskRepository extends BaseRepository<TaskEntity> {
  async search(criteria: TaskSearchCriteria): Promise<TaskQueryResult> {
    const conditions = ['c.orgId = @orgId']
    const parameters: SqlParameter[] = [{ name: '@orgId', value: criteria.orgId }]

    if (criteria.status) {
      conditions.push('c.status = @status')
      parameters.push({ name: '@status', value: criteria.status })
    }
    if (criteria.priority) {
      conditions.push('c.priority = @priority')
      parameters.push({ name: '@priority', value: criteria.priority })
    }

    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.${criteria.sortBy} ${criteria.sortOrder.toUpperCase()}`,
      parameters
    }

    const options: FeedOptions = {
      partitionKey: criteria.orgId,
      maxItemCount: criteria.pageSize,
      continuationToken: criteria.continuationToken
    }

    const response = await this.container.items.query<TaskEntity>(query, options).fetchNext()
    return {
      items: response.resources ?? [],
      continuationToken: response.continuationToken,
      requestCharge: response.requestCharge
    }
  }
}
