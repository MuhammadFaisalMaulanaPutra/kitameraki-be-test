import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { container } from "../../config/container";
import { GetFormSettingUseCase } from "../../application/use-cases/form-setting/get-form-setting-use-case";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { AuthenticatedHandler } from "../../domain/types";
import { withAuth } from "../../middleware/with-auth";
import { RequestContext } from "../../context/request-context";

const getFormSettingHandler: AuthenticatedHandler = async (request: HttpRequest, context: InvocationContext, user: RequestContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const organizationId = user.organizationId;
    const useCase = container.resolve(GetFormSettingUseCase);
    const result = await useCase.execute(organizationId);
    
    if (!result) {
        return ApiResponseBuilder.success({ message: 'No form setting found' }, 200, requestId);
    }

    return ApiResponseBuilder.success(result, 200, requestId);
};

export const GetFormSetting = withErrorHandling(withAuth(getFormSettingHandler));

app.http('GetFormSetting', {
    methods: ['GET'],
    route: 'form-settings',
    authLevel: 'anonymous',
    handler: GetFormSetting
});
