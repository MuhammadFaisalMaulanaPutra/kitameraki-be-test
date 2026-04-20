import { BulkOperationType, Container } from "@azure/cosmos";
import { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { BulkDeleteTaskResult, QueryResult } from "../../domain/types";
import { Task } from "../../domain/Task";
import { chunkArray } from "../../utils/util";

export class TaskRepository implements ITaskRepository {
    constructor(private container: Container) {}

    async create(task: Task): Promise<Task> {
        try {
            const { resource } = await this.container.items.create(task);
            return resource as Task;
        } catch (error) {
            console.error('Error add new task:', error);
            throw error;
        }
    }

    async findAll(organizationId: string, token?: string): Promise<QueryResult<Task>> {
        try {
            const query = {
                    query: "SELECT * FROM c"
                }
            
            const { resources, continuationToken } = await this.container.items.query(query, {
                maxItemCount: 10,
                continuationToken: token,
                partitionKey: organizationId
            }).fetchNext();

            return { resources, continuationToken }
        } catch (error) {
            console.error('Error get task list:', error);
            throw error;
        }
    }
    
    async findById(organizationId: string, id: string): Promise<Task> {
        try {
            const result = await this.container.item(id, organizationId).read();
            return result.resource as Task;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            console.error('Error finding task by ID:', error);
            throw error;
        }
    }

    async update(task: Task): Promise<Task> {
        const result = await this.container.item(task.id, task.organizationId).replace(task);
        return result.resource as Task;
    }
    
    async delete(organizationId: string, id: string): Promise<boolean> {
        try {
            await this.container.item(id, organizationId).delete();
            return true
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
    
    async bulkDelete(organizationId: string, ids: string[]): Promise<BulkDeleteTaskResult> {
        const successIds: string[] = [];
        const failedIds: string[] = [];

        try {
            const chunks = chunkArray(ids, 10);

            for (const chunk of chunks) {
                const operations = chunk.map(id => ({
                    operationType: BulkOperationType.Delete,
                    id,
                    partitionKey: organizationId
                }));

                const results = await this.container.items.bulk(operations);

                results.forEach((r, index) => {
                    const id = chunk[index];

                    if (r.statusCode >= 200 && r.statusCode < 300) {
                        successIds.push(id);
                    } else {
                        failedIds.push(id);
                    }
                });
            }

            return { successIds, failedIds };
        } catch (error) {
            console.error('Error bulk delete tasks:', error);
            throw error;
        }
    }
}