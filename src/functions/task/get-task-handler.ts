import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { GetTaskUseCase } from "../../application/use-cases/task/get-task-use-case";
import { NotFoundError } from "../../domain/errors/domain-error";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { GetTaskDTO } from "../../application/dtos/requests/task-request-dto";
import { GetTaskSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { RequestContext } from "../../context/request-context";
import { withAuth } from "../../middleware/with-auth";

const getTaskHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const id = request.params.id;
    const organizationId = user.organizationId;
    
    const validatedInput = validateSchema(GetTaskSchema, { id });
    const getTaskDTO: GetTaskDTO = {
            ...validatedInput,
            organizationId
        }
    const useCase = container.resolve(GetTaskUseCase);
    const result = await useCase.execute(getTaskDTO);
    
    if (!result) {
        throw new NotFoundError();
    }

    return ApiResponseBuilder.success(result, 200, requestId);
};

export const GetTask = withErrorHandling(withAuth(getTaskHandler));

app.http('GetTask', {
    methods: ['GET'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: GetTask
});