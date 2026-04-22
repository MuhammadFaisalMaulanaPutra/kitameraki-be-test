import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createTask } from "../services/taskService";
import { TaskRequestDto } from "../dto/task.dto";
import { errorResponse, successResponse } from "../utils/response";


export async function InsertTask(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as TaskRequestDto;


    const result = await createTask(body);

    return {
      status: 201,
      jsonBody: successResponse(result, "Task created successfully"),
    };

  } catch (error: any) {
    return {
      status: 400,
      jsonBody: errorResponse(error.message),
    };
  }
}

app.http('InsertTask', {
    methods: ['POST'],
    route: 'newTask',
    authLevel: 'anonymous',
    handler: InsertTask
});
