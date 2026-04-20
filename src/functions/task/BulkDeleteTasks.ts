import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { BulkDeleteTasksUseCase } from "../../application/use-cases/task/BulkDeleteTasksUseCase";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { MessageResponseDTO } from "../../application/dtos/responses/TaskResponseDTO";
import { BulkDeleteTasksDTO } from "../../application/dtos/requests/TaskRequestDTO";
import { BulkDeleteTasksSchema } from "../../application/validators/TaskValidator";
import { validateSchema } from "../../application/validators/SchemaValidator";
import { withErrorHandling } from "../../infrastructure/http/errorHandler";

const bulkDeleteTasksHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = request.query.get('organizationId');
    const body = await request.json() as Record<string, unknown>;
    
    const bulkDeleteTasksDTO: BulkDeleteTasksDTO = validateSchema(BulkDeleteTasksSchema, { ...body, organizationId });
    const useCase = container.resolve(BulkDeleteTasksUseCase);
    const { successIds } = await useCase.execute(bulkDeleteTasksDTO);
    
    const result: MessageResponseDTO = { message: `${successIds?.length || 0} of ${bulkDeleteTasksDTO.ids?.length || 0} tasks deleted successfully` };
    
    return ApiResponseBuilder.success(result, 200, requestId);
};

export const BulkDeleteTasks = withErrorHandling(bulkDeleteTasksHandler, 'An unexpected error occurred');

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    route: 'tasks/bulk',
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});