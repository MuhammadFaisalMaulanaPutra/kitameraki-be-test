import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for BulkDeleteTasks: "${request.url}"`);

  try {
    const ids = await request.json() as string[];
    const organizationId = request.query.get('organizationId');

    if (!organizationId || !Array.isArray(ids)) {
      return apiResponse.error(
        "organizationId and an array of ids are required", 
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Process deletions in parallel
    await Promise.all(ids.map(id => taskRepository.delete({ id, organizationId })));

    return apiResponse.success(null, HTTP_STATUS.NO_CONTENT);

  } catch (error: any) {
    context.error(`[Error] BulkDeleteTasks failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
};
