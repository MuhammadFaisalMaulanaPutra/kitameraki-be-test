import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { UpdateTaskUseCase } from "../../application/use-cases/task/UpdateTaskUseCase";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { UpdateTaskDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { UpdateTaskSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const updateTaskHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const body = await request.json() as Record<string, unknown>;
    
    const updateTaskDTO: UpdateTaskDTO = validateSchema(UpdateTaskSchema, { ...body, id });
    const useCase = container.resolve(UpdateTaskUseCase);
    const result = await useCase.execute(updateTaskDTO);
    
    return ApiResponseBuilder.success(result, 200, requestId);
};

export const UpdateTask = withErrorHandling(updateTaskHandler, 'An unexpected error occurred');

app.http('UpdateTask', {
    methods: ['PUT', 'PATCH'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: UpdateTask
});