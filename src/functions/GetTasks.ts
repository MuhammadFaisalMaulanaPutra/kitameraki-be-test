import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasks } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get('organizationId');

        if (!organizationId) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing organizationId' }
            };
        }

        const tasks = await getTasks(organizationId);

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: tasks
        };
    } catch (error: any) {
        context.error('GetTasks error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('GetTasks', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: GetTasks,
});

