import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { BulkDeleteTasksUseCase } from "../../application/use-cases/task/bulk-delete-tasks-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { MessageResponseDTO } from "../../application/dtos/responses/task-response-dto";
import { BulkDeleteTasksDTO } from "../../application/dtos/requests/task-request-dto";
import { BulkDeleteTasksSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";

const getBulkDeleteTasksHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const body = await request.json();
    
    const validatedInput = validateSchema(BulkDeleteTasksSchema, body);
    const bulkDeleteTasksDTO: BulkDeleteTasksDTO = {
            ...validatedInput,
            organizationId
        }
    const useCase = container.resolve(BulkDeleteTasksUseCase);
    const { successIds } = await useCase.execute(bulkDeleteTasksDTO);
    
    const result: MessageResponseDTO = { message: `${successIds?.length || 0} of ${bulkDeleteTasksDTO.ids?.length || 0} tasks deleted successfully` };
    
    return ApiResponseBuilder.success(result, 200, requestId);
};

export const BulkDeleteTasks = withErrorHandling(withAuth(getBulkDeleteTasksHandler));

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    route: 'tasks/bulk',
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});