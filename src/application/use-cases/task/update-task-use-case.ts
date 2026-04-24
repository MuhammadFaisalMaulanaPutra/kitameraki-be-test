import { injectable, inject } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { Task } from "../../../domain/task";
import { UpdateTaskDTO } from "../../dtos/requests/task-request-dto";
import { NotFoundError } from "../../../domain/errors/domain-error";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class UpdateTaskUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(updateTaskDTO: UpdateTaskDTO): Promise<TaskResponseDTO> {
        const existingTask = await this.repo.findById(updateTaskDTO.organizationId, updateTaskDTO.id);
        if (!existingTask) {
            throw new NotFoundError();
        }

        const updatedTask = {
            ...existingTask,
            ...(updateTaskDTO.title && { title: updateTaskDTO.title }),
            ...(updateTaskDTO.description !== undefined && { description: updateTaskDTO.description }),
            ...(updateTaskDTO.status && { status: updateTaskDTO.status }),
            ...(updateTaskDTO.customFields !== undefined && { customFields: updateTaskDTO.customFields }),
            updatedAt: new Date().toISOString()
        } as Task;

        return this.repo.update(updatedTask);
    }
}