import { Task } from "../Task"
import { BulkDeleteTaskResult, QueryResult } from "../types"

export interface ITaskRepository {
    create(task: Task): Promise<Task>
    findAll(organizationId: string, token?: string): Promise<QueryResult<Task>>
    findById(organizationId: string, id: string): Promise<Task | null>
    update(task: Task): Promise<Task>
    delete(organizationId: string, id: string): Promise<boolean>
    bulkDelete(organizationId: string, ids: string[]): Promise<BulkDeleteTaskResult>
}