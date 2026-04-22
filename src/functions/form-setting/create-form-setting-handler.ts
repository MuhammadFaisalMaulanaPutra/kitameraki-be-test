import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { CreateFormSettingUseCase } from "../../application/use-cases/form-setting/create-form-setting-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { FormSettingSchema } from "../../application/validators/form-setting-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";
import { FormSettingDTO } from "../../application/dtos/requests/form-setting-request-dto";

const createFormSettingHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const body = await request.json();
    
    const validatedInput = validateSchema(FormSettingSchema, body);
    const formSettingDTO: FormSettingDTO = {
        ...validatedInput,
        organizationId
    };

    const useCase = container.resolve(CreateFormSettingUseCase);
    const result = await useCase.execute(formSettingDTO);
    
    return ApiResponseBuilder.created(result, requestId);
};

export const CreateFormSetting = withErrorHandling(withAuth(createFormSettingHandler));

app.http('CreateFormSetting', {
    methods: ['POST'],
    route: 'form-settings',
    authLevel: 'anonymous',
    handler: CreateFormSetting
});
