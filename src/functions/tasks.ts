import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as taskService from "@/services/task.service";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  BulkDeleteTasksSchema,
  GetTasksQuerySchema,
} from "@/schemas/task.schema";
import {
  ok,
  created,
  noContent,
  badRequest,
  handleControllerError,
} from "@/utils/http-response";
import { logSecurityEvent } from "@/utils/audit-logger";
import { normalizeTaskPayload } from "@/utils/sanitizer";

// GET /api/tasks
app.http("tasks-list", {
  methods: ["GET"],
  route: "tasks",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      context.log(`GET /api/tasks triggered`);
      const queryParams = Object.fromEntries(req.query.entries());
      const parseResult = GetTasksQuerySchema.safeParse(queryParams);

      if (!parseResult.success) {
        return badRequest("Invalid query parameters", parseResult.error.format());
      }

      const { tasks, meta } = await taskService.getTasks(parseResult.data);
      return ok(tasks, meta);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// GET /api/tasks/{id}
app.http("tasks-get", {
  methods: ["GET"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const taskId = req.params.id;
      const organizationId = req.query.get("organizationId");
      if (!organizationId) {
        return badRequest("Query parameter 'organizationId' is required");
      }

      const task = await taskService.getTask(taskId, organizationId);
      return ok(task);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// POST /api/tasks
app.http("tasks-create", {
  methods: ["POST"],
  route: "tasks",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const rawBody = (await req.json()) as Record<string, unknown>;
      const effectiveBody = normalizeTaskPayload(rawBody, req.query.get("organizationId"));
      const parseResult = CreateTaskSchema.safeParse(effectiveBody);

      if (!parseResult.success) {
        logSecurityEvent("VALIDATION_FAILED", {
          context,
          details: { endpoint: "tasks-create", errors: parseResult.error.format() },
        });
        return badRequest("Validation error", parseResult.error.format());
      }

      const createdTask = await taskService.createTask(parseResult.data);
      logSecurityEvent("TASK_CREATED", {
        organizationId: createdTask.organizationId,
        context,
        details: { taskId: createdTask.id },
      });
      return created(createdTask);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// PATCH /api/tasks/{id}
app.http("tasks-update", {
  methods: ["PATCH"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const taskId = req.params.id;
      const organizationId = req.query.get("organizationId");
      if (!organizationId) {
        return badRequest("Query parameter 'organizationId' is required");
      }

      const rawBody = (await req.json()) as Record<string, unknown>;
      const effectiveBody = normalizeTaskPayload(rawBody);
      const parseResult = UpdateTaskSchema.safeParse(effectiveBody);

      if (!parseResult.success) {
        logSecurityEvent("VALIDATION_FAILED", {
          organizationId,
          context,
          details: { endpoint: "tasks-update", taskId, errors: parseResult.error.format() },
        });
        return badRequest("Validation error", parseResult.error.format());
      }

      const updatedTask = await taskService.updateTask(taskId, organizationId, parseResult.data);
      logSecurityEvent("TASK_UPDATED", {
        organizationId,
        context,
        details: { taskId },
      });
      return ok(updatedTask);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// DELETE /api/tasks/{id}
app.http("tasks-delete", {
  methods: ["DELETE"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const taskId = req.params.id;
      const organizationId = req.query.get("organizationId");
      if (!organizationId) {
        return badRequest("Query parameter 'organizationId' is required");
      }

      await taskService.deleteTask(taskId, organizationId);
      logSecurityEvent("TASK_DELETED", {
        organizationId,
        context,
        details: { taskId },
      });
      return noContent();
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// DELETE /api/tasks/bulk-delete
app.http("tasks-bulk-delete", {
  methods: ["DELETE"],
  route: "tasks/bulk-delete",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const queryParams = Object.fromEntries(req.query.entries());
      const parseResult = BulkDeleteTasksSchema.safeParse(queryParams);

      if (!parseResult.success) {
        logSecurityEvent("VALIDATION_FAILED", {
          context,
          details: { endpoint: "tasks-bulk-delete", errors: parseResult.error.format() },
        });
        return badRequest("Validation error", parseResult.error.format());
      }

      const result = await taskService.bulkDeleteTasks(
        parseResult.data.taskIds,
        parseResult.data.organizationId
      );
      logSecurityEvent("BULK_DELETE_TRIGGERED", {
        organizationId: parseResult.data.organizationId,
        context,
        details: {
          requestedCount: parseResult.data.taskIds.length,
          deletedCount: result.deletedIds.length,
          failedCount: result.failedIds.length,
        },
      });
      return ok(result);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});
