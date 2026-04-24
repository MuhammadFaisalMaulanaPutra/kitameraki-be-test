import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { UpdateFormSettingUseCase } from "../../application/use-cases/form-setting/update-form-setting-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { FormSettingSchema } from "../../application/validators/form-setting-validator";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";
import { FormSettingDTO } from "../../application/dtos/requests/form-setting-request-dto";
import { NotFoundError } from "../../domain/errors/domain-error";

const updateFormSettingHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const id = request.params.id;
    const body = await request.json();
    
    const validatedInput = validateSchema(FormSettingSchema, body);
    const formSettingDTO: FormSettingDTO = {
        ...validatedInput,
        organizationId
    };

    const useCase = container.resolve(UpdateFormSettingUseCase);
    const result = await useCase.execute(id, formSettingDTO);
    
    if (!result) {
        throw new NotFoundError();
    }

    return ApiResponseBuilder.success(result, 200, requestId);
};

export const UpdateFormSetting = withErrorHandling(withAuth(updateFormSettingHandler));

app.http('UpdateFormSetting', {
    methods: ['PUT'],
    route: 'form-settings/{id}',
    authLevel: 'anonymous',
    handler: UpdateFormSetting
});
