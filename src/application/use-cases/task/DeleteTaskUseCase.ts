import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../../domain/repositories/ITaskRepository";
import { DeleteTaskDTO } from "../../dtos/requests/TaskRequestDTO";

@injectable()
export class DeleteTaskUseCase {
    constructor(@inject("ITaskRepository") private repo: ITaskRepository) {}

    async execute(deleteTaskDTO: DeleteTaskDTO): Promise<boolean> {
        return this.repo.delete(deleteTaskDTO.organizationId, deleteTaskDTO.id);
    }
}