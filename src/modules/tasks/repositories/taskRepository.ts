import { Container } from "@azure/cosmos";
import { getContainer } from "../../../core/database/cosmos";
import { TaskSchema } from "../models/task";
import { Task, FindTasksParams, TaskIdentityParams, UpdateTaskParams } from "../types";

export class TaskRepository {
  private container: Container;

  constructor() {
    this.container = getContainer("Tasks");
  }

  async findAll(params: FindTasksParams): Promise<{ tasks: Task[], totalCount: number }> {
    const { 
      organizationId, 
      pageSize = 10, 
      pageIndex = 0, 
      search, 
      filter 
    } = params;

    let query = "SELECT * FROM c WHERE c.organizationId = @orgId";
    const parameters: { name: string, value: any }[] = [{ name: "@orgId", value: organizationId }];

    if (search) {
      query += " AND CONTAINS(LOWER(c.title), LOWER(@search))";
      parameters.push({ name: "@search", value: search });
    }

    if (filter?.status) {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: filter.status });
    }

    if (filter?.priority) {
      query += " AND c.priority = @priority";
      parameters.push({ name: "@priority", value: filter.priority });
    }

    // Pagination & Ordering
    // Use createdAt for stable sorting instead of _ts (which changes on every update)
    query += " ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit";
    parameters.push({ name: "@offset", value: pageIndex * pageSize });
    parameters.push({ name: "@limit", value: pageSize });

    const { resources: tasks } = await this.container.items.query<Task>({ query, parameters }).fetchAll();
    
    // Count Query
    let countQuery = "SELECT VALUE COUNT(1) FROM c WHERE c.organizationId = @orgId";
    const countParams = [{ name: "@orgId", value: organizationId }];

    if (search) {
      countQuery += " AND CONTAINS(LOWER(c.title), LOWER(@search))";
      countParams.push({ name: "@search", value: search });
    }
    if (filter?.status) {
      countQuery += " AND c.status = @status";
      countParams.push({ name: "@status", value: filter.status });
    }
    if (filter?.priority) {
      countQuery += " AND c.priority = @priority";
      countParams.push({ name: "@priority", value: filter.priority });
    }

    const { resources: countResult } = await this.container.items.query<number>({ 
      query: countQuery, 
      parameters: countParams 
    }).fetchAll();
    
    return {
      tasks,
      totalCount: countResult[0] || 0
    };
  }

  async findById(params: TaskIdentityParams): Promise<Task | null> {
    const { id, organizationId } = params;
    const { resource } = await this.container.item(id, organizationId).read<Task>();
    
    if (!resource) {
      return null;
    }
    
    return resource;
  }

  async create(taskData: Task): Promise<Task> {
    const now = new Date().toISOString();
    const validatedData = TaskSchema.parse({
      ...taskData,
      createdAt: taskData.createdAt || now,
      updatedAt: taskData.updatedAt || now
    });
    const { resource } = await this.container.items.create<Task>(validatedData);
    
    if (!resource) {
      throw new Error(`Failed to create Task: ${taskData.title}`);
    }
    
    return resource;
  }

  async update(params: UpdateTaskParams): Promise<Task> {
    const { id, organizationId, updates } = params;
    
    // Auto-update the updatedAt timestamp
    updates.updatedAt = new Date().toISOString();

    const operations = Object.entries(updates).map(([key, value]) => ({
      op: 'set' as const,
      path: `/${key}`,
      value
    }));

    const { resource } = await this.container.item(id, organizationId).patch<Task>({ operations });
    
    if (!resource) {
      throw new Error(`Failed to update Task: ${id}`);
    }
    
    return resource;
  }

  async delete(params: TaskIdentityParams): Promise<void> {
    const { id, organizationId } = params;
    await this.container.item(id, organizationId).delete();
  }
}

export const taskRepository = new TaskRepository();
