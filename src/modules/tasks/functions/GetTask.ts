import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for GetTask: "${request.url}"`);

  try {
    const id = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    if (!id || !organizationId) {
      return apiResponse.error("id and organizationId are required", HTTP_STATUS.BAD_REQUEST);
    }

    const task = await taskRepository.findById({ id, organizationId });

    if (!task) {
        return apiResponse.error("Task not found", HTTP_STATUS.NOT_FOUND);
    }

    return apiResponse.success(task);

  } catch (error: any) {
    context.error(`[Error] GetTask failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
};
