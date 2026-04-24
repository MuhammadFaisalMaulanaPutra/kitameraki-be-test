import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { DeleteTaskUseCase } from "../../application/use-cases/task/delete-task-use-case";
import { NotFoundError } from "../../domain/errors/domain-error";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { MessageResponseDTO } from "../../application/dtos/responses/task-response-dto";
import { DeleteTaskDTO } from "../../application/dtos/requests/task-request-dto";
import { DeleteTaskSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { withAuth } from "../../middleware/with-auth";
import { AuthenticatedHandler } from "../../domain/types";
import { RequestContext } from "../../context/request-context";

const getDeleteTaskHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const organizationId = user.organizationId;
    
    const validatedInput = validateSchema(DeleteTaskSchema, { id });
    const deleteTaskDTO: DeleteTaskDTO = {
            ...validatedInput,
            organizationId
        }
    const useCase = container.resolve(DeleteTaskUseCase);
    const result = await useCase.execute(deleteTaskDTO);
    
    if (!result) {
        throw new NotFoundError();
    }
    
    const response: MessageResponseDTO = { message: "Task deleted successfully" };

    return ApiResponseBuilder.success(response, 200, requestId);
};

export const DeleteTask = withErrorHandling(withAuth(getDeleteTaskHandler));

app.http('DeleteTask', {
    methods: ['DELETE'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: DeleteTask
});