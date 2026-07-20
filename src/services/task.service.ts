import { v4 as uuidv4 } from "uuid";
import { SqlQuerySpec } from "@azure/cosmos";
import { getTasksContainer } from "./cosmosClient";
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from "../models/task.model";

/**
 * Service layer untuk semua operasi CRUD pada Task.
 * Semua business logic terpusat di sini — function handlers
 * hanya bertanggung jawab untuk routing dan validasi input.
 */
export class TaskService {
  /**
   * Mengambil satu task berdasarkan id dan organizationId.
   */
  static async getTaskById(
    id: string,
    organizationId: string
  ): Promise<Task | undefined> {
    const container = getTasksContainer();
    const { resource } = await container
      .item(id, organizationId)
      .read<Task>();
    return resource;
  }

  /**
   * Mengambil semua task milik suatu organization.
   * Menggunakan parameterized query untuk mencegah SQL/NoSQL injection.
   */
  static async getTasksByOrganization(
    organizationId: string
  ): Promise<Task[]> {
    const container = getTasksContainer();

    // Parameterized query — AMAN dari injection
    const querySpec: SqlQuerySpec = {
      query: "SELECT * FROM c WHERE c.organizationId = @orgId",
      parameters: [{ name: "@orgId", value: organizationId }],
    };

    const { resources } = await container.items
      .query<Task>(querySpec)
      .fetchAll();
    return resources;
  }

  /**
   * Membuat task baru. ID di-generate otomatis di server.
   */
  static async createTask(data: CreateTaskInput): Promise<Task> {
    const container = getTasksContainer();

    const newTask: Task = {
      id: uuidv4(),
      ...data,
    };

    const { resource } = await container.items.create<Task>(newTask);
    return resource!;
  }

  /**
   * Update task (partial update via patch).
   * Hanya field yang dikirim yang akan di-update.
   */
  static async updateTask(
    id: string,
    organizationId: string,
    fields: UpdateTaskInput
  ): Promise<Task> {
    const container = getTasksContainer();

    const patchOperations = Object.entries(fields).map(([key, value]) => ({
      op: "replace" as const,
      path: `/${key}`,
      value,
    }));

    const { resource } = await container
      .item(id, organizationId)
      .patch<Task>(patchOperations);
    return resource!;
  }

  /**
   * Menghapus satu task.
   */
  static async deleteTask(
    id: string,
    organizationId: string
  ): Promise<void> {
    const container = getTasksContainer();
    await container.item(id, organizationId).delete();
  }

  /**
   * Menghapus banyak task sekaligus.
   * Menggunakan Promise.all agar semua delete benar-benar selesai
   * sebelum function return (fix dari bug forEach async).
   */
  static async bulkDeleteTasks(
    ids: string[],
    organizationId: string
  ): Promise<void> {
    const container = getTasksContainer();

    await Promise.all(
      ids.map((taskId) =>
        container.item(taskId, organizationId).delete()
      )
    );
  }
}
