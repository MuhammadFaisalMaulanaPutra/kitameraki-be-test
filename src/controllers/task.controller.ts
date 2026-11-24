import type { Request, Response } from 'express';
import { getOrganizationId } from '../middlewares/organization-context.middleware';
import type { TaskService } from '../services/task.service';
import { sendNoContent, sendSuccess } from '../utils/response';
import { idParamSchema } from '../validators/common.validator';
import {
  bulkDeleteTasksSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../validators/task.validator';
import { validateBody, validateParams } from '../validators/validate';

/** HTTP layer only: parse/validate the request, delegate to the service, shape the response. */
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = validateParams(listTasksQuerySchema, req.query, 'Invalid query parameters');
    const { items, meta } = await this.taskService.listTasks(getOrganizationId(req), query);
    sendSuccess(res, 200, 'Tasks retrieved successfully', items, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = validateParams(idParamSchema, req.params, 'Invalid task id');
    const task = await this.taskService.getTask(getOrganizationId(req), id);
    sendSuccess(res, 200, 'Task retrieved successfully', task);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = validateBody(createTaskSchema, req.body);
    const task = await this.taskService.createTask(getOrganizationId(req), input);
    res.location(`${req.baseUrl}/${task.id}`);
    sendSuccess(res, 201, 'Task created successfully', task);
  };

  replace = async (req: Request, res: Response): Promise<void> => {
    const { id } = validateParams(idParamSchema, req.params, 'Invalid task id');
    const input = validateBody(createTaskSchema, req.body);
    const task = await this.taskService.replaceTask(getOrganizationId(req), id, input);
    sendSuccess(res, 200, 'Task updated successfully', task);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = validateParams(idParamSchema, req.params, 'Invalid task id');
    const input = validateBody(updateTaskSchema, req.body);
    const task = await this.taskService.updateTask(getOrganizationId(req), id, input);
    sendSuccess(res, 200, 'Task updated successfully', task);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = validateParams(idParamSchema, req.params, 'Invalid task id');
    await this.taskService.deleteTask(getOrganizationId(req), id);
    sendNoContent(res);
  };

  bulkDelete = async (req: Request, res: Response): Promise<void> => {
    const { ids } = validateBody(bulkDeleteTasksSchema, req.body);
    const result = await this.taskService.bulkDeleteTasks(getOrganizationId(req), ids);
    sendSuccess(res, 200, `${result.deletedIds.length} task(s) deleted`, result);
  };
}
