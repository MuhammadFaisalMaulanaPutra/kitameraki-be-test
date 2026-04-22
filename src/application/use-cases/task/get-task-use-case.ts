import { inject, injectable } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { FormSettingRepository } from "../../../domain/repositories/form-setting-repository";
import { GetTaskDTO } from "../../dtos/requests/task-request-dto";
import { TaskResponseDTO } from "../../dtos/responses/task-response-dto";

@injectable()
export class GetTaskUseCase {
    constructor(
        @inject("TaskRepository") private taskRepo: TaskRepository,
        @inject("FormSettingRepository") private formSettingRepo: FormSettingRepository
    ) {}

    async execute(getTaskDTO: GetTaskDTO): Promise<TaskResponseDTO | null> {
        const task = await this.taskRepo.findById(getTaskDTO.organizationId, getTaskDTO.id);
        
        if (!task) {
            return null;
        }

        return task as TaskResponseDTO;
    }
}