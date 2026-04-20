import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { CreateTaskUseCase } from "../../application/use-cases/task/CreateTaskUseCase";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { CreateTaskDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { CreateTaskSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const insertTaskHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const body = await request.json();
    
    const createTaskDTO: CreateTaskDTO = validateSchema(CreateTaskSchema, body);
    const useCase = container.resolve(CreateTaskUseCase);
    const result = await useCase.execute(createTaskDTO);
    
    return ApiResponseBuilder.created(result, requestId);
};

export const InsertTask = withErrorHandling(insertTaskHandler, 'Failed to create task');

app.http('InsertTask', {
    methods: ['POST'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: InsertTask
});