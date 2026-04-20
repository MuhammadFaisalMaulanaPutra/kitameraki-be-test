import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { Task } from "../../../domain/Task";
import { CreateTaskDTO } from "../../dtos/requests/TaskRequestDTO";
import { TaskResponseDTO } from "../../dtos/responses/TaskResponseDTO";

@injectable()
export class CreateTaskUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

    async execute(createTaskDTO: CreateTaskDTO): Promise<TaskResponseDTO> {
        const task = Task.create(createTaskDTO);
        return this.repo.create(task);
    }
}