import { inject, injectable } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { QueryResult } from "../../../domain/types";
import { GetTasksDTO } from "../../dtos/requests/task-request-dto";
import { Task } from "../../../domain/task";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class GetTasksUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(getTasksDTO: GetTasksDTO): Promise<QueryResult<TaskResponseDTO>> {
        return this.repo.findAll(getTasksDTO.organizationId, getTasksDTO.token);
    }
}