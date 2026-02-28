import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskRepository } from "../repositories/taskRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

import { Task } from "../types";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for InsertTask: "${request.url}"`);

  try {
    const body = await request.json();
    const newTask = await taskRepository.create(body as Task); 

    return apiResponse.success(newTask, HTTP_STATUS.CREATED);

  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiResponse.error("Validation Failed", HTTP_STATUS.BAD_REQUEST, error.errors);
    }

    context.error(`[Error] InsertTask failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
};
