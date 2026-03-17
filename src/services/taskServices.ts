import { Task } from "../models/task";
import { CosmosClient } from "@azure/cosmos";

// init cosmos DB
const connectionString = process.env.COSMOS_DB_CONNECTION || "";
const client = new CosmosClient(connectionString);

//buat db & table/container/collection
const database = client.database("TaskApp");
const container = database.container("Tasks");

//buat function service
export const taskService = {
    //function create task
    async createTask(newTask: Task): Promise<Task> {
        const taskToInsert = {
            ...newTask,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { resource } = await container.items.create(taskToInsert);
        return resource as unknown as Task;
    },

    //function get tasks
    async getTasks(
        page: number,
        limit: number,
        status?: string,
        search?: string,
    ): Promise<any> {
        // pagination
        const offset = (page - 1) * limit;

        // query utuk status
        let queryText = "SELECT * FROM c";
        const parameters: any[] = [];
        const conditions: string[] = [];

        if (status && status !== "All") {
            conditions.push("c.status = @status");
            parameters.push({ name: "@status", value: status });
        }

        if (search) {
            conditions.push("CONTAINS(LOWER(c.title), LOWER(@search))");
            parameters.push({ name: "@search", value: search });
        }

        if (conditions.length > 0) {
            queryText += " WHERE " + conditions.join(" AND ");
        }

        // query utk pagination
        queryText += " ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit";
        parameters.push({ name: "@offset", value: offset });
        parameters.push({ name: "@limit", value: limit });

        const querySpec = {
            query: queryText,
            parameters: parameters,
        };

        const { resources } = await container.items.query(querySpec).fetchAll();
        return {
            data: resources,
            currentPage: page,
            currentLimit: limit,
        };
    },

    //function update task
    async updateTask(id: string, updatedData: Partial<Task>): Promise<Task> {
        // ambil task berdasarkan id karena partition key /id di emulator
        const itemRef = container.item(id, id);

        const { resource: existingTask } = await itemRef.read();

        if (!existingTask) {
            return null;
        }

        // timpa data lama dengan data baru
        const taskToUpdate = {
            ...existingTask,
            ...updatedData,
            updatedAt: new Date().toISOString(), //waktu update
        };

        // simpan ke cosmos db
        const { resource } = await itemRef.replace(taskToUpdate);
        return resource as Task;
    },

    //function delete task
    async deleteTask(id: string): Promise<boolean> {
        try {
            const itemRef = container.item(id, id);
            await itemRef.delete();
            return true;
        } catch (error: any) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    },

    //function get task by id atau detail task
    async getTaskById(id: string): Promise<Task | null> {
        try {
            const { resource } = await container.item(id, id).read();
            return (resource as Task) || null;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    },

    async bulkDeleteTasks(ids: string[]): Promise<number> {
        // lakukan mapping menggunakan fungsi deleteTask sebelumnya
        const deletePromises = ids.map((id) => this.deleteTask(id));

        // promise atau tunggu semua delete selesai
        const result = await Promise.all(deletePromises);

        // total yang berhasil di hapus
        const succesCount = result.filter((isSuccess) => isSuccess === true).length;

        return succesCount;
    },
};
