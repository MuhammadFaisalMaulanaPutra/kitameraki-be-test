import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { DeleteTaskUseCase } from "../../application/use-cases/task/DeleteTaskUseCase";
import { NotFoundError } from "../../domain/errors/DomainError";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { MessageResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { DeleteTaskDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { DeleteTaskSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const deleteTaskHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const organizationId = request.query.get('organizationId');
    
    const deleteTaskDTO: DeleteTaskDTO = validateSchema(DeleteTaskSchema, { organizationId, id });
    const useCase = container.resolve(DeleteTaskUseCase);
    const result = await useCase.execute(deleteTaskDTO);
    
    if (!result) {
        throw new NotFoundError();
    }
    
    const response: MessageResponseDTO = { message: "Task deleted successfully" };

    return ApiResponseBuilder.success(response, 200, requestId);
};

export const DeleteTask = withErrorHandling(deleteTaskHandler, 'An unexpected error occurred');

app.http('DeleteTask', {
    methods: ['DELETE'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: DeleteTask
});