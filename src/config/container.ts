import "reflect-metadata";
import { container } from "tsyringe";
import { TaskRepositoryImpl } from "../infrastructure/database/task-repository-impl";
import { FormSettingRepositoryImpl } from "../infrastructure/database/form-setting-repository-impl";
import { CreateTaskUseCase } from "../application/use-cases/task/create-task-use-case";
import { DeleteTaskUseCase } from "../application/use-cases/task/delete-task-use-case";
import { BulkDeleteTasksUseCase } from "../application/use-cases/task/bulk-delete-tasks-use-case";
import { UpdateTaskUseCase } from "../application/use-cases/task/update-task-use-case";
import { GetTaskUseCase } from "../application/use-cases/task/get-task-use-case";
import { GetTasksUseCase } from "../application/use-cases/task/get-tasks-use-case";
import { GetFormSettingUseCase } from "../application/use-cases/form-setting/get-form-setting-use-case";
import { CreateFormSettingUseCase } from "../application/use-cases/form-setting/create-form-setting-use-case";
import { UpdateFormSettingUseCase } from "../application/use-cases/form-setting/update-form-setting-use-case";
import { containers } from "../utils/cosmos-client";
import { UserRepositoryImpl } from "../infrastructure/database/user-repository-impl";
import { LoginUseCase } from "../application/use-cases/auth/login-use-case";

container.register("TaskRepository", {
    useValue: new TaskRepositoryImpl(containers.tasks)
});

container.register("FormSettingRepository", {
    useValue: new FormSettingRepositoryImpl(containers.formSettings)
});

container.register("UserRepository", {
    useValue: new UserRepositoryImpl(containers.users)
});

container.registerSingleton(CreateTaskUseCase);
container.registerSingleton(DeleteTaskUseCase);
container.registerSingleton(BulkDeleteTasksUseCase);
container.registerSingleton(UpdateTaskUseCase);
container.registerSingleton(GetTaskUseCase);
container.registerSingleton(GetTasksUseCase);

container.registerSingleton(GetFormSettingUseCase);
container.registerSingleton(CreateFormSettingUseCase);
container.registerSingleton(UpdateFormSettingUseCase);

container.registerSingleton(LoginUseCase);

export { container }