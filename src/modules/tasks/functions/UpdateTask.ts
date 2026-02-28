import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { TaskSchema } from "../models/task";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for UpdateTask: "${request.url}"`);

  try {
    const id = request.query.get('id');
    const organizationId = request.query.get('organizationId');
    
    if (!id || !organizationId) {
      return apiResponse.error("id and organizationId are required", HTTP_STATUS.BAD_REQUEST);
    }

    const body = await request.json();
    const validatedUpdates = TaskSchema.partial().parse(body);

    const updatedTask = await taskRepository.update({ id, organizationId, updates: validatedUpdates });

    return apiResponse.success(updatedTask);

  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiResponse.error("Validation Failed", HTTP_STATUS.BAD_REQUEST, error.errors);
    }

    context.error(`[Error] UpdateTask failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
};
