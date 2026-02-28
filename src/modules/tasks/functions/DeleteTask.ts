import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for DeleteTask: "${request.url}"`);

  try {
    const id = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    if (!id || !organizationId) {
      return apiResponse.error("id and organizationId are required", HTTP_STATUS.BAD_REQUEST);
    }

    await taskRepository.delete({ id, organizationId });

    return apiResponse.success(null, HTTP_STATUS.NO_CONTENT);

  } catch (error: any) {
    context.error(`[Error] DeleteTask failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
};
