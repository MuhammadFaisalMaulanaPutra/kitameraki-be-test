import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { bulkDeleteTasks } from "../services/taskService";
import { BulkDeleteItemDto } from "../dto/task.dto";
import { errorResponse, successResponse } from "../utils/response";


export async function BulkDeleteTasks(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as BulkDeleteItemDto[];

    const result = await bulkDeleteTasks(body);

    return {
  status: 200,
  jsonBody: successResponse(null, "Bulk delete completed", {
    total: result.total,
    success: result.success,
    failed: result.failed
  })
};

  } catch (error: any) {
    return {
      status: 400,
      jsonBody: errorResponse(error.message) 
    };
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "tasks/bulk-delete",
  handler: BulkDeleteTasks,
});