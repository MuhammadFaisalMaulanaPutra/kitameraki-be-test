import { inject, injectable } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { FormSettingRepository } from "../../../domain/repositories/form-setting-repository";
import { QueryResult } from "../../../domain/types";
import { GetTasksDTO } from "../../dtos/requests/task-request-dto";
import { Task } from "../../../domain/task";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class GetTasksUseCase {
    constructor(
        @inject("TaskRepository") private taskRepo: TaskRepository,
        @inject("FormSettingRepository") private formSettingRepo: FormSettingRepository
    ) {}

    async execute(getTasksDTO: GetTasksDTO): Promise<QueryResult<TaskResponseDTO>> {
        const result = await this.taskRepo.findAll(
            getTasksDTO.organizationId, 
            getTasksDTO.token,
            getTasksDTO.keyword,
            getTasksDTO.filter
        );

        return result as QueryResult<TaskResponseDTO>;
    }
}