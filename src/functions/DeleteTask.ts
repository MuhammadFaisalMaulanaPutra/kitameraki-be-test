import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { deleteTask } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const id = request.query.get('id');

        if (!id) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing id query parameter' }
            };
        }

        const deleted = await deleteTask(id);

        if (!deleted) {
            return {
                status: 404,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Task not found' }
            };
        }

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: { message: 'Task deleted successfully' }
        };
    } catch (error: any) {
        context.error('DeleteTask error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('DeleteTask', {
    methods: ['DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: DeleteTask,
});

