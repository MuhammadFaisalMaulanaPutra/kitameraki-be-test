import { randomUUID } from 'node:crypto'
import { NotFoundError } from '@/errors/not-found.error'
import type { TaskEntity, TaskPriority, TaskStatus } from '@/models/entities/task.entity'
import type { BatchDeleteTasksSchema } from '@/models/generated/batch-delete-tasks'
import type { CreateTaskSchema } from '@/models/generated/create-task'
import type { PatchTaskSchema } from '@/models/generated/patch-task'
import type { TaskQuerySchema } from '@/models/generated/task-query'
import type { TaskRepository } from '@/repositories/task.repository'
import dayjs from 'dayjs'

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  list(query: TaskQuerySchema, organizationId: string) {
    return this.taskRepository.search({
      organizationId,
      status: query.status as TaskStatus | undefined,
      priority: query.priority as TaskPriority | undefined,
      search: query.search,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      continuationToken: query.continuationToken
    })
  }

  async create(body: CreateTaskSchema, organizationId: string): Promise<TaskEntity> {
    const now = dayjs().toISOString()
    return this.taskRepository.create({
      ...body,
      id: randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now
    })
  }

  getById(id: string, organizationId: string): Promise<TaskEntity> {
    return this.taskRepository.getById(id, [organizationId, id])
  }

  async update(id: string, organizationId: string, body: PatchTaskSchema): Promise<TaskEntity> {
    const existing = await this.taskRepository.getById(id, [organizationId, id])
    const now = dayjs().toISOString()
    return this.taskRepository.replace({
      ...existing,
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description ?? undefined }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ?? undefined }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId ?? undefined }),
      id,
      organizationId,
      updatedAt: now
    })
  }

  delete(id: string, organizationId: string): Promise<void> {
    return this.taskRepository.delete(id, [organizationId, id])
  }

  async batchDelete(
    body: BatchDeleteTasksSchema,
    organizationId: string
  ): Promise<{ deletedCount: number }> {
    if (body.ids.length === 0) throw new NotFoundError('Tasks', organizationId)
    await this.taskRepository.batchDelete(body.ids, organizationId)
    return { deletedCount: body.ids.length }
  }
}
