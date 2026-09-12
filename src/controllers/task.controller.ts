import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TaskPriority, TaskStatus, taskPriorities, taskStatuses } from '../models/task.model';
import { TaskService } from '../services/task.service';
import { ValidationError } from '../shared/errors';
import { errorResponse, jsonResponse, readJsonBody } from '../shared/http';
import { taskIdSchema } from '../validators/task.validator';

const maxPageSize = 100;

function parseListQuery(request: HttpRequest) {
  const page = Number(request.query.get('page') ?? '1');
  const pageSize = Number(request.query.get('pageSize') ?? '20');
  const status = request.query.get('status') as TaskStatus | null;
  const priority = request.query.get('priority') as TaskPriority | null;

  if (!Number.isInteger(page) || page < 1) throw new ValidationError('page must be a positive integer');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
    throw new ValidationError(`pageSize must be an integer between 1 and ${maxPageSize}`);
  }
  if (status && !taskStatuses.includes(status)) throw new ValidationError('Invalid status filter');
  if (priority && !taskPriorities.includes(priority)) throw new ValidationError('Invalid priority filter');

  return {
    search: request.query.get('search')?.trim() || undefined,
    status: status ?? undefined,
    priority: priority ?? undefined,
    page,
    pageSize
  };
}

function getTaskId(request: HttpRequest): string {
  const id = request.params.id;
  if (!taskIdSchema.safeParse(id).success) throw new ValidationError('id must be a valid UUID');
  return id;
}

export class TaskController {
  constructor(private readonly service: TaskService) {}

  async getAll(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(200, await this.service.findAll(parseListQuery(request)));
    } catch (error) {
      return errorResponse(error, context);
    }
  }

  async getById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(200, await this.service.findById(getTaskId(request)));
    } catch (error) {
      return errorResponse(error, context);
    }
  }

  async create(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(201, await this.service.create(await readJsonBody(request)));
    } catch (error) {
      return errorResponse(error, context);
    }
  }

  async update(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(200, await this.service.update(getTaskId(request), await readJsonBody(request)));
    } catch (error) {
      return errorResponse(error, context);
    }
  }

  async delete(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      await this.service.delete(getTaskId(request));
      return { status: 204 };
    } catch (error) {
      return errorResponse(error, context);
    }
  }
}

