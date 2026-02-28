import { app } from "@azure/functions";
import { GetTasks } from "./functions/GetTasks";
import { InsertTask } from "./functions/InsertTask";
import { GetTask } from "./functions/GetTask";
import { UpdateTask } from "./functions/UpdateTask";
import { DeleteTask } from "./functions/DeleteTask";
import { BulkDeleteTasks } from "./functions/BulkDeleteTasks";


// GET /api/v1/GetTasks?organizationId=...
app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/GetTasks',
  handler: GetTasks
});

// GET /api/v1/GetTask?id=...&organizationId=...
app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/GetTask',
  handler: GetTask
});

// POST /api/v1/InsertTask
app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'v1/InsertTask',
  handler: InsertTask
});

// POST /api/v1/UpdateTask?id=...&organizationId=...
app.http('UpdateTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'v1/UpdateTask',
  handler: UpdateTask
});

// DELETE /api/v1/DeleteTask?id=...&organizationId=...
app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'v1/DeleteTask',
  handler: DeleteTask
});

// DELETE /api/v1/BulkDeleteTasks?organizationId=...
app.http('BulkDeleteTasks', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'v1/BulkDeleteTasks',
  handler: BulkDeleteTasks
});
