import { inject, injectable } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { GetTaskDTO } from "../../dtos/requests/TaskRequestDTO";
import { TaskResponseDTO } from "../../dtos/responses/TaskResponseDTO";

@injectable()
export class GetTaskUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

    async execute(getTaskDTO: GetTaskDTO): Promise<TaskResponseDTO | null> {
        return this.repo.findById(getTaskDTO.organizationId, getTaskDTO.id);
    }
}