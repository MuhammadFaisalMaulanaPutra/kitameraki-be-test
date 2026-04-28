import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTaskById } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const id = request.query.get('id');

        if (!id) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing id' }
            };
        }

        const task = await getTaskById(id);

        if (!task) {
            return {
                status: 404,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Task not found' }
            };
        }

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: task
        };
    } catch (error: any) {
        context.error('GetTask error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('GetTask', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: GetTask,
});

