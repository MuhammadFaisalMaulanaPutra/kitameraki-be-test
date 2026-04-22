import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { fetchAllTasks } from "../services/taskService";
import { errorResponse, successResponse } from "../utils/response";

export async function GetTasks(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const query = Object.fromEntries(request.query);

    const result = await fetchAllTasks(query);

    return {
      status: 200,
      jsonBody: successResponse(result, "Tasks fetched successfully"),
    };
  } catch (error: any) {
    return {
      status: 400,
      jsonBody: errorResponse(error.message),
    };
  }
}

app.http('GetTasks', {
    methods: ['GET'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: GetTasks
});
