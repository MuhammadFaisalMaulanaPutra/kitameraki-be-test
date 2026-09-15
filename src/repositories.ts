import type { Container, SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import { AppError, isCosmosConflict, isCosmosNotFound } from './errors';
import { observeCosmosOperation } from './telemetry';
import type {
  FieldDefinition,
  FieldFilter,
  FormSettingsDocument,
  ListTasksQuery,
  TaskDocument,
  TaskSummary,
} from './domain/models';
import type { RequestTelemetry } from './telemetry';

export interface TaskListResult {
  items: TaskDocument[];
  summary: TaskSummary;
  total: number;
}

export interface TaskRepository {
  findById(
    organizationId: string,
    id: string,
    telemetry?: RequestTelemetry,
  ): Promise<TaskDocument | undefined>;
  create(task: TaskDocument, telemetry?: RequestTelemetry): Promise<TaskDocument>;
  replace(
    task: TaskDocument,
    expectedEtag?: string,
    telemetry?: RequestTelemetry,
  ): Promise<TaskDocument>;
  delete(organizationId: string, id: string, telemetry?: RequestTelemetry): Promise<boolean>;
  list(
    organizationId: string,
    query: ListTasksQuery,
    fields: FieldDefinition[],
    now: Date,
    telemetry?: RequestTelemetry,
  ): Promise<TaskListResult>;
}

export interface FormSettingsRepository {
  get(
    organizationId: string,
    telemetry?: RequestTelemetry,
  ): Promise<FormSettingsDocument | undefined>;
  save(
    document: FormSettingsDocument,
    expectedEtag?: string,
    telemetry?: RequestTelemetry,
  ): Promise<FormSettingsDocument>;
}

interface AggregateResult {
  dueThisWeek?: number;
  filteredTotal?: number;
  inProgress?: number;
  total?: number;
}

interface QueryParts {
  expression: string;
  parameters: SqlParameter[];
}

const TASK_PROJECTION = [
  'c.id',
  'c.organizationId',
  'c.title',
  'c.description',
  'c.dueDate',
  'c.priority',
  'c.status',
  'c.tags',
  'c.customFields',
  'c.createdAt',
  'c.updatedAt',
].join(', ');

export class CosmosTaskRepository implements TaskRepository {
  constructor(private readonly container: Container) {}

  async findById(
    organizationId: string,
    id: string,
    telemetry?: RequestTelemetry,
  ): Promise<TaskDocument | undefined> {
    try {
      const response = await observeCosmosOperation(telemetry, 'read-item', this.container.id, () =>
        this.container.item(id, organizationId).read<TaskDocument>(),
      );
      return response.resource;
    } catch (error) {
      if (isCosmosNotFound(error)) return undefined;
      throw error;
    }
  }

  async create(task: TaskDocument, telemetry?: RequestTelemetry): Promise<TaskDocument> {
    const response = await observeCosmosOperation(telemetry, 'create-item', this.container.id, () =>
      this.container.items.create(task),
    );
    if (!response.resource) throw new Error('Cosmos DB did not return the created task.');
    return response.resource;
  }

  async replace(
    task: TaskDocument,
    expectedEtag?: string,
    telemetry?: RequestTelemetry,
  ): Promise<TaskDocument> {
    try {
      const response = await observeCosmosOperation(
        telemetry,
        'replace-item',
        this.container.id,
        () =>
          this.container.item(task.id, task.organizationId).replace(task, {
            accessCondition: expectedEtag
              ? { type: 'IfMatch', condition: expectedEtag }
              : undefined,
          }),
      );
      if (!response.resource) throw new Error('Cosmos DB did not return the replaced task.');
      return response.resource;
    } catch (error) {
      if (isCosmosConflict(error)) throw new TaskConflictError();
      throw error;
    }
  }

  async delete(organizationId: string, id: string, telemetry?: RequestTelemetry): Promise<boolean> {
    try {
      await observeCosmosOperation(telemetry, 'delete-item', this.container.id, () =>
        this.container.item(id, organizationId).delete(),
      );
      return true;
    } catch (error) {
      if (isCosmosNotFound(error)) return false;
      throw error;
    }
  }

  async list(
    organizationId: string,
    query: ListTasksQuery,
    fields: FieldDefinition[],
    now: Date,
    telemetry?: RequestTelemetry,
  ): Promise<TaskListResult> {
    const filter = buildFilterExpression(query.q, query.filters, fields);
    const organizationParameter = { name: '@organizationId', value: organizationId };
    const offset = (query.page - 1) * query.pageSize;
    const itemSpec: SqlQuerySpec = {
      query: `SELECT ${TASK_PROJECTION} FROM c WHERE c.organizationId = @organizationId${filter.expression ? ` AND ${filter.expression}` : ''} ORDER BY c._ts DESC, c.id ASC OFFSET @offset LIMIT @limit`,
      parameters: [
        organizationParameter,
        ...filter.parameters,
        { name: '@offset', value: offset },
        { name: '@limit', value: query.pageSize },
      ],
    };

    const currentTime = now.toISOString();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const filteredTotalExpression = filter.expression
      ? `SUM((${filter.expression}) ? 1 : 0)`
      : 'COUNT(1)';
    const aggregateSpec: SqlQuerySpec = {
      query: `SELECT VALUE { filteredTotal: ${filteredTotalExpression}, total: COUNT(1), inProgress: SUM(c.status = @inProgressStatus ? 1 : 0), dueThisWeek: SUM((IS_DEFINED(c.dueDate) AND c.dueDate >= @now AND c.dueDate <= @weekEnd) ? 1 : 0) } FROM c WHERE c.organizationId = @organizationId`,
      parameters: [
        organizationParameter,
        ...filter.parameters,
        { name: '@inProgressStatus', value: 'in-progress' },
        { name: '@now', value: currentTime },
        { name: '@weekEnd', value: weekEnd },
      ],
    };

    const [itemsResponse, aggregateResponse] = await Promise.all([
      observeCosmosOperation(telemetry, 'query-items', this.container.id, () =>
        this.container.items
          .query<TaskDocument>(itemSpec, { partitionKey: organizationId })
          .fetchAll(),
      ),
      observeCosmosOperation(telemetry, 'query-aggregate', this.container.id, () =>
        this.container.items
          .query<AggregateResult>(aggregateSpec, { partitionKey: organizationId })
          .fetchAll(),
      ),
    ]);

    const aggregate = aggregateResponse.resources[0] ?? {};
    return {
      items: itemsResponse.resources,
      total: aggregate.filteredTotal ?? 0,
      summary: {
        total: aggregate.total ?? 0,
        inProgress: aggregate.inProgress ?? 0,
        dueThisWeek: aggregate.dueThisWeek ?? 0,
      },
    };
  }
}

export class CosmosFormSettingsRepository implements FormSettingsRepository {
  constructor(private readonly container: Container) {}

  async get(
    organizationId: string,
    telemetry?: RequestTelemetry,
  ): Promise<FormSettingsDocument | undefined> {
    try {
      const response = await observeCosmosOperation(
        telemetry,
        'read-settings',
        this.container.id,
        () => this.container.item('form-settings', organizationId).read<FormSettingsDocument>(),
      );
      return response.resource;
    } catch (error) {
      if (isCosmosNotFound(error)) return undefined;
      throw error;
    }
  }

  async save(
    document: FormSettingsDocument,
    expectedEtag?: string,
    telemetry?: RequestTelemetry,
  ): Promise<FormSettingsDocument> {
    try {
      const response = expectedEtag
        ? await observeCosmosOperation(telemetry, 'replace-settings', this.container.id, () =>
            this.container.item(document.id, document.organizationId).replace(document, {
              accessCondition: { type: 'IfMatch', condition: expectedEtag },
            }),
          )
        : await observeCosmosOperation(telemetry, 'create-settings', this.container.id, () =>
            this.container.items.create(document),
          );
      if (!response.resource) throw new Error('Cosmos DB did not return the saved settings.');
      return response.resource;
    } catch (error) {
      if (isCosmosConflict(error)) throw new SettingsConflictError();
      throw error;
    }
  }
}

export class SettingsConflictError extends Error {}
export class TaskConflictError extends Error {}

export const buildWhereClause = (
  organizationId: string,
  q: string | undefined,
  filters: FieldFilter[],
  fields: FieldDefinition[],
): { clause: string; parameters: SqlParameter[] } => {
  const filter = buildFilterExpression(q, filters, fields);
  return {
    clause: `WHERE c.organizationId = @organizationId${filter.expression ? ` AND ${filter.expression}` : ''}`,
    parameters: [{ name: '@organizationId', value: organizationId }, ...filter.parameters],
  };
};

const buildFilterExpression = (
  q: string | undefined,
  filters: FieldFilter[],
  fields: FieldDefinition[],
): QueryParts => {
  const conditions: string[] = [];
  const parameters: SqlParameter[] = [];

  if (q) {
    parameters.push({ name: '@q', value: q });
    const searchable = ['c.title', 'c.description'];
    const custom = fields
      .filter(
        (field) => field.kind === 'custom' && (field.type === 'text' || field.type === 'email'),
      )
      .map(fieldPath);
    const textConditions = [...searchable, ...custom].map((path) => `CONTAINS(${path}, @q, true)`);
    textConditions.push(
      'EXISTS(SELECT VALUE tag FROM tag IN c.tags WHERE CONTAINS(tag, @q, true))',
    );
    conditions.push(`(${textConditions.join(' OR ')})`);
  }

  filters.forEach((filter, index) => {
    const field = fields.find((candidate) => candidate.id === filter.fieldId);
    if (!field) {
      throw new AppError(400, 'validation_error', `Unknown filter field: ${filter.fieldId}.`);
    }
    const path = fieldPath(field);
    if (filter.operator === 'between') {
      if (filter.from) {
        conditions.push(`${path} >= @filter${index}From`);
        parameters.push({ name: `@filter${index}From`, value: filter.from });
      }
      if (filter.to) {
        conditions.push(`${path} <= @filter${index}To`);
        parameters.push({ name: `@filter${index}To`, value: filter.to });
      }
    } else if (field.id === 'tags') {
      conditions.push(
        `EXISTS(SELECT VALUE tag FROM tag IN c.tags WHERE CONTAINS(tag, @filter${index}, true))`,
      );
      parameters.push({ name: `@filter${index}`, value: filter.value });
    } else if (filter.operator === 'contains') {
      conditions.push(`CONTAINS(${path}, @filter${index}, true)`);
      parameters.push({ name: `@filter${index}`, value: filter.value });
    } else {
      conditions.push(`${path} = @filter${index}`);
      parameters.push({ name: `@filter${index}`, value: filter.value });
    }
  });

  return { expression: conditions.join(' AND '), parameters };
};

const fieldPath = (field: FieldDefinition): string => {
  if (field.kind === 'custom') {
    if (!/^custom-[0-9a-f-]{36}$/i.test(field.id)) {
      throw new AppError(400, 'validation_error', 'Invalid custom field ID.');
    }
    return `c.customFields["${field.id}"]`;
  }

  const allowed: Record<string, string> = {
    title: 'c.title',
    description: 'c.description',
    dueDate: 'c.dueDate',
    priority: 'c.priority',
    status: 'c.status',
    tags: 'c.tags',
  };
  const path = allowed[field.id];
  if (!path) throw new AppError(400, 'validation_error', 'Invalid system field ID.');
  return path;
};
