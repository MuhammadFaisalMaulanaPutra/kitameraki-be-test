import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { GetTasksUseCase } from "../../application/use-cases/task/get-tasks-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskListResponseDTO } from "../../application/dtos/responses/task-response-dto";
import { GetTasksDTO } from "../../application/dtos/requests/task-request-dto";
import { GetTasksSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { RequestContext } from "../../context/request-context";
import { withAuth } from "../../middleware/with-auth";
import { AuthenticatedHandler } from "../../domain/types";

const getTasksHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const paginationToken = request.query.get('paginationToken') || undefined;
    const keyword = request.query.get('keyword') || undefined;
    const filter = request.query.get('filter') || undefined;
    
    
    const validatedInput = validateSchema(GetTasksSchema, { token: paginationToken, keyword, filter });
    const getTasksDTO: GetTasksDTO = {
            ...validatedInput,
            organizationId
        }
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

export const GetTasks = withErrorHandling(withAuth(getTasksHandler));

app.http('GetTasks', {
    methods: ['GET'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: GetTasks
});