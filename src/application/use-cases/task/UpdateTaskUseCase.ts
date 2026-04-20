import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { Task } from "../../../domain/Task";
import { UpdateTaskDTO } from "../../dtos/requests/TaskRequestDTO";
import { NotFoundError } from "../../../domain/errors/DomainError";
import { TaskResponseDTO } from "../../dtos/responses/TaskResponseDTO";

@injectable()
export class UpdateTaskUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

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
            updatedAt: new Date().toISOString()
        } as Task;

        return this.repo.update(updatedTask);
    }
}