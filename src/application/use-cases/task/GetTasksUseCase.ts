import { inject, injectable } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { QueryResult } from "../../../domain/types";
import { GetTasksDTO } from "../../dtos/requests/TaskRequestDTO";
import { Task } from "../../../domain/Task";
import { TaskResponseDTO } from "../../dtos/responses/TaskResponseDTO";

@injectable()
export class GetTasksUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

    async execute(getTasksDTO: GetTasksDTO): Promise<QueryResult<TaskResponseDTO>> {
        return this.repo.findAll(getTasksDTO.organizationId, getTasksDTO.token);
    }
}