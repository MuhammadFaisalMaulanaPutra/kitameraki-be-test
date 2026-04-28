import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFormSettings } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get('organizationId');

        if (!organizationId) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing organizationId' }
            };
        }

        const settings = await getFormSettings(organizationId);

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: settings
        };
    } catch (error: any) {
        context.error('GetFormSettings error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('GetFormSettings', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: GetFormSettings,
});

