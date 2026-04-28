import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { updateTask } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const body = await request.json() as any;

        if (!body.id) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing task id' }
            };
        }

        const updated = await updateTask(body);

        if (!updated) {
            return {
                status: 404,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Task not found' }
            };
        }

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: updated
        };
    } catch (error: any) {
        context.error('UpdateTask error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('UpdateTask', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: UpdateTask,
});

