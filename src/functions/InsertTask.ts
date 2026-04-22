/**
 * @file InsertTask.ts
 * @description Azure Function handler for creating a new task.
 *
 * Endpoint:  POST /api/tasks
 *
 * Request body:  CreateTaskRequest (JSON)
 * Response:      The created Task document (201 Created).
 *
 * Implementation notes:
 *  - The server generates the `id` (UUID v4) to prevent clients from
 *    supplying crafted IDs that could collide with system documents
 *    (e.g. "GLOBAL_SETTINGS") or exploit ID-based logic.
 *  - `createdAt` and `updatedAt` timestamps are set server-side to ensure
 *    they cannot be spoofed by clients.
 *  - Full input validation is delegated to the validators module so the
 *    handler remains focused on orchestration.
 */

import { v4 as uuidv4 } from "uuid";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { Task, CreateTaskRequest } from "../models/models";
import { created, badRequest, internalError } from "../utils/responseHelpers";
import { validateCreateTaskRequest } from "../utils/validators";

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // -----------------------------------------------------------------------
    // 1. Parse and validate the request body
    // -----------------------------------------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const validationError = validateCreateTaskRequest(body);
    if (validationError) {
      return badRequest(validationError);
    }

    const requestData = body as CreateTaskRequest;

    // -----------------------------------------------------------------------
    // 2. Construct the Task document with server-assigned fields
    // -----------------------------------------------------------------------
    const now = new Date().toISOString();
    const newTask: Task = {
      ...requestData,
      id: uuidv4(), // Server-generated ID — clients must NOT supply this.
      createdAt: now,
      updatedAt: now,
    };

    // -----------------------------------------------------------------------
    // 3. Persist to Cosmos DB
    // -----------------------------------------------------------------------
    const { resource } = await container.items.create<Task>(newTask);

    context.log(`Task created successfully. id=${newTask.id}`);
    return created(resource);
  } catch (error) {
    context.error("Error creating task:", error);
    return internalError("creating the task");
  }
}

app.http("InsertTask", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "tasks",
  handler: InsertTask,
});
