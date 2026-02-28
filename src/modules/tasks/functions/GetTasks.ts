import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

import { TaskStatus, TaskPriority } from "../types";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for GetTasks: "${request.url}"`);

  try {
    const organizationId = request.query.get('organizationId');
    const pageIndex = parseInt(request.query.get('pageIndex') || '0');
    const pageSize = parseInt(request.query.get('pageSize') || '10');
    const search = request.query.get('search') || undefined;
    const status = request.query.get('status') || undefined;
    const priority = request.query.get('priority') || undefined;

    if (!organizationId) {
      return apiResponse.error("organizationId is required", HTTP_STATUS.BAD_REQUEST);
    }

    const { tasks, totalCount } = await taskRepository.findAll({
      organizationId, 
      pageSize, 
      pageIndex, 
      search, 
      filter: { 
        status: status as TaskStatus, 
        priority: priority as TaskPriority 
      }
    });

    return apiResponse.success({
      tasks,
      totalCount,
      pageIndex,
      pageSize
    });

  } catch (error: any) {
    context.error(`[Error] GetTasks failed: ${error.message}`);
    
    return apiResponse.error("Internal Server Error");
  }
};
