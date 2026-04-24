import { injectable, inject } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { Task } from "../../../domain/task";
import { CreateTaskDTO } from "../../dtos/requests/task-request-dto";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class CreateTaskUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(createTaskDTO: CreateTaskDTO): Promise<TaskResponseDTO> {
        const task = Task.create(createTaskDTO);
        return this.repo.create(task);
    }
}