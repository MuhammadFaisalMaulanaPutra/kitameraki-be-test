import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { BulkDeleteTasksDTO } from "../../dtos/requests/TaskRequestDTO";
import { BulkDeleteTaskResponseDTO } from "../../dtos/responses/BulkDeleteTaskResponseDTO";

@injectable()
export class BulkDeleteTasksUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

    async execute(bulkDeleteTaskDTO: BulkDeleteTasksDTO): Promise<BulkDeleteTaskResponseDTO> {
        return this.repo.bulkDelete(bulkDeleteTaskDTO.organizationId, bulkDeleteTaskDTO.ids);
    }
}