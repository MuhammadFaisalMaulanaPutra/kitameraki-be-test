import { randomUUID } from 'node:crypto'
import { BadRequestError } from '@/errors/bad-request.error'
import { NotFoundError } from '@/errors/not-found.error'
import type { TaskEntity, TaskPriority, TaskStatus } from '@/models/entities/task.entity'
import type { BatchDeleteTasksSchema } from '@/models/generated/batch-delete-tasks'
import type { CreateTaskSchema } from '@/models/generated/create-task'
import type { PatchTaskSchema } from '@/models/generated/patch-task'
import type { TaskQuerySchema } from '@/models/generated/task-query'
import type { TaskRepository } from '@/repositories/task.repository'

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  list(query: TaskQuerySchema, orgId: string) {
    return this.taskRepository.search({
      orgId,
      status: query.status as TaskStatus | undefined,
      priority: query.priority as TaskPriority | undefined,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      pageSize: query.pageSize ?? 20,
      continuationToken: query.continuationToken
    })
  }

  async create(body: CreateTaskSchema, orgId: string): Promise<TaskEntity> {
    const now = new Date().toISOString()
    return this.taskRepository.create({
      ...body,
      id: randomUUID(),
      orgId,
      createdAt: now,
      updatedAt: now
    })
  }

  getById(id: string, orgId: string): Promise<TaskEntity> {
    return this.taskRepository.getById(id, orgId)
  }

  async update(
    id: string,
    body: PatchTaskSchema,
    etag: string | null,
    orgId: string
  ): Promise<TaskEntity> {
    if (!etag) throw new BadRequestError('If-Match header is required for optimistic concurrency.')
    const existing = await this.taskRepository.getById(id, orgId)
    const now = new Date().toISOString()
    return this.taskRepository.replace(
      {
        ...existing,
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description ?? undefined }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ?? undefined }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId ?? undefined }),
        id,
        orgId,
        updatedAt: now
      },
      etag
    )
  }

  delete(id: string, orgId: string): Promise<void> {
    return this.taskRepository.delete(id, orgId)
  }

  async batchDelete(
    body: BatchDeleteTasksSchema,
    orgId: string
  ): Promise<{ deletedCount: number }> {
    if (body.ids.length === 0) throw new NotFoundError('Tasks', orgId)
    await this.taskRepository.batchDelete(body.ids, orgId)
    return { deletedCount: body.ids.length }
  }
}
