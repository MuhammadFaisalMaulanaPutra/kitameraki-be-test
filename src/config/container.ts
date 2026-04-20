import "reflect-metadata";
import { container } from "tsyringe";
import { TaskRepository } from "../infrastructure/database/TaskRepository";
import { CreateTaskUseCase } from "../application/use-cases/task/CreateTaskUseCase";
import { DeleteTaskUseCase } from "../application/use-cases/task/DeleteTaskUseCase";
import { BulkDeleteTasksUseCase } from "../application/use-cases/task/BulkDeleteTasksUseCase";
import { UpdateTaskUseCase } from "../application/use-cases/task/UpdateTaskUseCase";
import { GetTaskUseCase } from "../application/use-cases/task/GetTaskUseCase";
import { GetTasksUseCase } from "../application/use-cases/task/GetTasksUseCase";
import { containers } from "../utils/cosmosClient";

container.register("ITaskRepository", {
    useValue: new TaskRepository(containers.tasks)
})

container.registerSingleton(CreateTaskUseCase);
container.registerSingleton(DeleteTaskUseCase);
container.registerSingleton(BulkDeleteTasksUseCase);
container.registerSingleton(UpdateTaskUseCase);
container.registerSingleton(GetTaskUseCase);
container.registerSingleton(GetTasksUseCase);

export { container }