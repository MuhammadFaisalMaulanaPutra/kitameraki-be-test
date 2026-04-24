import { BulkOperationType, Container } from "@azure/cosmos";
import { TaskRepository } from "../../domain/repositories/task-repository";
import { BulkDeleteTaskResult, QueryResult } from "../../domain/types";
import { Task } from "../../domain/task";
import { chunkArray } from "../../utils/util";

export class TaskRepositoryImpl implements TaskRepository {
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

    async findAll(organizationId: string, token?: string, keyword?: string, filter?: string): Promise<QueryResult<Task>> {
        try {
            let sql = `SELECT * FROM c`;
            const conditions: string[] = [];
            const parameters: { name: string, value: any }[] = [];

            if (keyword) {
                conditions.push(`CONTAINS(c.title, @keyword, true)`);
                parameters.push({ name: "@keyword", value: keyword });
            }

            if (filter) {
                conditions.push(`c.status = @filter`);
                parameters.push({ name: "@filter", value: filter });
            }

            if (conditions.length > 0) {
                sql += ` WHERE ${conditions.join(' AND ')}`;
            }

            sql += ` ORDER BY c.createdAt DESC`;

            const query = {
                query: sql,
                parameters: parameters
            }
            
            const { resources, continuationToken: nextToken  } = await this.container.items.query(query, {
                maxItemCount: 10,
                continuationToken: token,
                partitionKey: organizationId
            }).fetchNext();

            return { resources, continuationToken: nextToken  }
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
            console.error('Error get task by ID:', error);
            throw error;
        }
    }

    async update(task: Task): Promise<Task> {
        try {
            const result = await this.container.item(task.id, task.organizationId).replace(task);
            return result.resource as Task;
        } catch (error) {
            if (error.code === 404) {
                return null;
            }
            console.error('Error update task by ID:', error);
            throw error;
        }
    }
    
    async delete(organizationId: string, id: string): Promise<boolean> {
        try {
            await this.container.item(id, organizationId).delete();
            return true
        } catch (error) {
            console.error('Error delete task:', error);
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