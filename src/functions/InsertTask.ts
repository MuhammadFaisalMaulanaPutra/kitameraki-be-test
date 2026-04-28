import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getDefaultCosmosClient } from "../cosmos.util";
import {
  ETaskStatus,
  ITaskDBStruct,
  ITaskPostData,
} from "../interfaces/Task.interface";
import { createResponse, HttpError, response500 } from "../libs/http";

function validateTaskPostData(d: any): d is ITaskPostData {
  if (!d?.name) {
    throw new HttpError("Task Name must be provided!");
  }

  if (d) {
    if (typeof d.status !== "number") {
      delete d.status;
    } else {
      if (!(d.status >= 0 && d.status <= 3)) {
        throw new HttpError("Invalid Task Status!");
      }
    }
  }

  return true;
}

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    if (!validateTaskPostData(body)) return;

    // list of allowed props
    const props = [
      "name",
      "description",
      "status" /* another list from custom form */,
    ];

    const toInsert: ITaskDBStruct = {
      organizationId: 1, // hardcoded value
      name: "", // override
      status: ETaskStatus.NOT_STARTED,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const k of props) {
      const v = body[k];
      if (!!v) toInsert[k] = v;
    }

    const client = getDefaultCosmosClient();
    const createdTask = await client
      .database("TaskApp")
      .container("Tasks")
      .items.create(toInsert);

    return createResponse(createdTask.resource);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("InsertTask", e);
  }
}

app.http("InsertTask", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: InsertTask,
});
