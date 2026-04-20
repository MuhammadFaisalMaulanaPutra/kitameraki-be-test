import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { GetTasksUseCase } from "../../application/use-cases/task/GetTasksUseCase";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskListResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { GetTasksDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { GetTasksSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const getTasksHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = request.query.get('organizationId');
    const token = request.query.get('token') || undefined;
    
    const getTasksDTO: GetTasksDTO = validateSchema(GetTasksSchema, { organizationId, token });
    const useCase = container.resolve(GetTasksUseCase);
    const { resources, continuationToken } = await useCase.execute(getTasksDTO);

    const result: TaskListResponseDTO = {
        data: resources,
        pagination: {
            continuationToken,
            hasNext: !!continuationToken
        }
    };

    return ApiResponseBuilder.success(result, 200, requestId);
};

export const GetTasks = withErrorHandling(getTasksHandler, 'An unexpected error occurred');

app.http('GetTasks', {
    methods: ['GET'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: GetTasks
});