import type { BaseEntity } from '@/models/entities/base.entity'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface TaskEntity extends BaseEntity {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  assigneeId?: string
}
