import { randomUUID } from "node:crypto";
import { app } from "@azure/functions";
import { tasks } from "../lib/cosmos";
import { handler, readJson, requireOrgId } from "../lib/http";
import { toTask } from "../lib/mappers";
import type { Task } from "../lib/types";
import { validateTaskInput } from "../lib/validation";

app.http("InsertTask", {
  methods: ["POST"],
  route: "tasks",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const input = validateTaskInput(await readJson(request), false);
    const now = new Date().toISOString();

    // server owns identity and timestamps
    const task: Task = {
      description: null, dueDate: null, priority: null, status: "todo", tags: [], customFields: {},
      ...input,
      title: input.title as string,
      id: randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
    };
    const { resource } = await tasks.items.create(task);
    return { status: 201, jsonBody: toTask(resource as unknown as Record<string, unknown>) };
  }),
});
