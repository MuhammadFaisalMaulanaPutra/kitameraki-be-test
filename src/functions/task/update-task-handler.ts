import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { UpdateTaskUseCase } from "../../application/use-cases/task/update-task-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { TaskResponseDTO } from "../../application/dtos/responses/task-response-dto";
import { UpdateTaskDTO } from "../../application/dtos/requests/task-request-dto";
import { UpdateTaskSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";
import { AuthenticatedHandler } from "../../domain/types";

const getUpdateTaskHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const organizationId = user.organizationId;
    const body = await request.json() as Record<string, unknown>;
    
    const validatedInput = validateSchema(UpdateTaskSchema, { ...body, id });
    const updateTaskDTO: UpdateTaskDTO = {
            ...validatedInput,
            organizationId
        }
    const useCase = container.resolve(UpdateTaskUseCase);
    const result = await useCase.execute(updateTaskDTO);
    
    return ApiResponseBuilder.success(result, 200, requestId);
};

export const UpdateTask = withErrorHandling(withAuth(getUpdateTaskHandler));

app.http('UpdateTask', {
    methods: ['PUT', 'PATCH'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: UpdateTask
});