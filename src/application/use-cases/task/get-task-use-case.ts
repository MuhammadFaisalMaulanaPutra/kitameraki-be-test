import { inject, injectable } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { GetTaskDTO } from "../../dtos/requests/task-request-dto";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class GetTaskUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(getTaskDTO: GetTaskDTO): Promise<TaskResponseDTO | null> {
        return this.repo.findById(getTaskDTO.organizationId, getTaskDTO.id);
    }
}