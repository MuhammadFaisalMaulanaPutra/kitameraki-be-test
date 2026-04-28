import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { saveFormSettings, type FormSettings } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function SaveFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const body = await request.json() as Partial<FormSettings>;

        if (!body.organizationId || !body.fields || !Array.isArray(body.fields)) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing required fields: organizationId and fields array' }
            };
        }

        // Validate each field
        const validTypes = ['text', 'date', 'datetime', 'email'];
        for (const field of body.fields) {
            if (!field.id || !field.label || !field.type) {
                return {
                    status: 400,
                    headers: CORS_HEADERS,
                    jsonBody: { error: 'Each field must have id, label, and type' }
                };
            }
            if (!validTypes.includes(field.type)) {
                return {
                    status: 400,
                    headers: CORS_HEADERS,
                    jsonBody: { error: `Invalid field type: ${field.type}. Must be one of: ${validTypes.join(', ')}` }
                };
            }
        }

        const settings: FormSettings = {
            organizationId: body.organizationId,
            fields: body.fields
        };

        const saved = await saveFormSettings(settings);

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: saved
        };
    } catch (error: any) {
        context.error('SaveFormSettings error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('SaveFormSettings', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: SaveFormSettings,
});

