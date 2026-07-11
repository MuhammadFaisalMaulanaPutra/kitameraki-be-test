import type { SqlParameter, SqlQuerySpec } from '@azure/cosmos';

/**
 * Pure builders for the task list queries. Kept free of any Cosmos client so the
 * SQL-injection-safe parameter binding can be unit-tested without a database
 * (see taskQuery.test.ts).
 */
export interface TaskListFilters {
  organizationId: string;
  status?: string;
  priority?: string;
  search?: string;
}

function buildWhere(filters: TaskListFilters): { where: string; parameters: SqlParameter[] } {
  const clauses: string[] = ['c.organizationId = @organizationId'];
  const parameters: SqlParameter[] = [{ name: '@organizationId', value: filters.organizationId }];

  if (filters.status) {
    clauses.push('c.status = @status');
    parameters.push({ name: '@status', value: filters.status });
  }
  if (filters.priority) {
    clauses.push('c.priority = @priority');
    parameters.push({ name: '@priority', value: filters.priority });
  }
  if (filters.search) {
    // Case-insensitive substring match on title/description. Bound as a
    // parameter — never string-interpolated — so it cannot alter the query.
    clauses.push('(CONTAINS(c.title, @search, true) OR CONTAINS(c.description, @search, true))');
    parameters.push({ name: '@search', value: filters.search });
  }

  return { where: `WHERE ${clauses.join(' AND ')}`, parameters };
}

export function buildTaskListQuery(
  filters: TaskListFilters,
  page: number,
  pageSize: number,
): SqlQuerySpec {
  const { where, parameters } = buildWhere(filters);
  const offset = (page - 1) * pageSize;
  return {
    query: `SELECT * FROM c ${where} ORDER BY c._ts DESC OFFSET @offset LIMIT @limit`,
    parameters: [
      ...parameters,
      { name: '@offset', value: offset },
      { name: '@limit', value: pageSize },
    ],
  };
}

export function buildTaskCountQuery(filters: TaskListFilters): SqlQuerySpec {
  const { where, parameters } = buildWhere(filters);
  return { query: `SELECT VALUE COUNT(1) FROM c ${where}`, parameters };
}
