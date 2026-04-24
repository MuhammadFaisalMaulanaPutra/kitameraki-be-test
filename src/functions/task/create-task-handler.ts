import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { CreateTaskUseCase } from "../../application/use-cases/task/create-task-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { CreateTaskDTO } from "../../application/dtos/requests/task-request-dto";
import { CreateTaskSchema } from "../../application/validators/task-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";

const getAddTaskHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const body = await request.json();
    
    const validatedInput = validateSchema(CreateTaskSchema, body);
    const createTaskDTO: CreateTaskDTO = {
            ...validatedInput,
            organizationId
        }
    const useCase = container.resolve(CreateTaskUseCase);
    const result = await useCase.execute(createTaskDTO);
    
    return ApiResponseBuilder.created(result, requestId);
};

export const InsertTask = withErrorHandling(withAuth(getAddTaskHandler));

app.http('InsertTask', {
    methods: ['POST'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: InsertTask
});