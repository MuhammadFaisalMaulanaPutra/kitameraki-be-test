import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";


export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = await request.json() as object;
    const taskId = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    let patchRequests = [];

    for (let key in body) {
        patchRequests.push({
            "op": "replace",
            "path": `/${key}`,
            "value": body[key]
        });
    }

    const createdTask = await tasksContainer.item(taskId, organizationId)
        .patch(patchRequests);

    return { jsonBody: createdTask.resource, status: 200 };
};

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: UpdateTask
});
