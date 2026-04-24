import { injectable, inject } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { BulkDeleteTasksDTO } from "../../dtos/requests/task-request-dto";
import { BulkDeleteTaskResponseDTO } from "../../dtos/responses/bulk-delete-task-response-dto";

@injectable()
export class BulkDeleteTasksUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(bulkDeleteTaskDTO: BulkDeleteTasksDTO): Promise<BulkDeleteTaskResponseDTO> {
        return this.repo.bulkDelete(bulkDeleteTaskDTO.organizationId, bulkDeleteTaskDTO.ids);
    }
}