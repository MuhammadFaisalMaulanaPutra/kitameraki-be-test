import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { insertTask, type Task } from '../lib/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const body = await request.json() as Partial<Task>;

        if (!body.title || !body.organizationId) {
            return {
                status: 400,
                headers: CORS_HEADERS,
                jsonBody: { error: 'Missing required fields: title and organizationId' }
            };
        }

        const task = await insertTask({
            title: body.title,
            organizationId: body.organizationId,
            status: body.status ?? 'todo',
            priority: body.priority ?? 'medium',
            dueDate: body.dueDate,
            description: body.description,
            assignedTo: body.assignedTo,
            customFields: body.customFields ?? {}
        });

        return {
            status: 201,
            headers: CORS_HEADERS,
            jsonBody: task
        };
    } catch (error: any) {
        context.error('InsertTask error:', error);
        return {
            status: 500,
            headers: CORS_HEADERS,
            jsonBody: { error: 'Internal server error', details: error.message }
        };
    }
}

app.http('InsertTask', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: InsertTask,
});

