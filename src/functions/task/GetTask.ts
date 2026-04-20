import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { GetTaskUseCase } from "../../application/use-cases/task/GetTaskUseCase";
import { NotFoundError } from "../../domain/errors/DomainError";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { GetTaskDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { GetTaskSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const getTaskHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const organizationId = request.query.get('organizationId');
    
    const getTaskDTO: GetTaskDTO = validateSchema(GetTaskSchema, { organizationId, id });
    const useCase = container.resolve(GetTaskUseCase);
    const result = await useCase.execute(getTaskDTO);
    
    if (!result) {
        throw new NotFoundError();
    }

    return ApiResponseBuilder.success(result, 200, requestId);
};

export const GetTask = withErrorHandling(getTaskHandler, 'An unexpected error occurred');

app.http('GetTask', {
    methods: ['GET'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: GetTask
});