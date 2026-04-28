import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { bulkDeleteTasks } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const body = await request.json() as { ids?: string[] };

        if (!body.ids || !Array.isArray(body.ids)) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Invalid ids: must be a string array' }
            };
        }

        await bulkDeleteTasks(body.ids);

        return {
            status: 200,
            headers: CORS_HEADERS,
            jsonBody: { message: 'Bulk delete success', deletedCount: body.ids.length }
        };
    } catch (error: any) {
        context.error('BulkDeleteTasks error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('BulkDeleteTasks', {
    methods: ['DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks,
});

