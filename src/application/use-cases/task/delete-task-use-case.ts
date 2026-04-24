import { injectable, inject } from "tsyringe";
import { TaskRepository } from "../../../domain/repositories/task-repository";
import { DeleteTaskDTO } from "../../dtos/requests/task-request-dto";

@injectable()
export class DeleteTaskUseCase {
    constructor(@inject("TaskRepository") private repo: TaskRepository) {}

    async execute(deleteTaskDTO: DeleteTaskDTO): Promise<boolean> {
        return this.repo.delete(deleteTaskDTO.organizationId, deleteTaskDTO.id);
    }
}