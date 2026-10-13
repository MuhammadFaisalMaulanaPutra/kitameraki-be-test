import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { formSettingService } from '../services/formSetting.service.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

export async function getFormSettingsHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`[HTTP GET] Processing GetFormSettings: ${request.url}`);
    try {
        const organizationId = request.query.get('organizationId') || '';
        const result = await formSettingService.getSettings(organizationId);
        return successResponse(result, 200);
    } catch (error) {
        return errorResponse(error, context);
    }
}

app.http('GetFormSettings', { methods: ['GET'], authLevel: 'anonymous', handler: getFormSettingsHandler });

export async function saveFormSettingsHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`[HTTP POST] Processing SaveFormSettings: ${request.url}`);
    try {
        const body = await request.json();
        const result = await formSettingService.saveSettings(body);
        return successResponse(result, 200);
    } catch (error) {
        return errorResponse(error, context);
    }
}

app.http('SaveFormSettings', { methods: ['POST'], authLevel: 'anonymous', handler: saveFormSettingsHandler });
