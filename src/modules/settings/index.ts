import { app } from "@azure/functions";
import { GetFormSettings } from "./functions/GetFormSettings";
import { UpdateFormSettings } from "./functions/UpdateFormSettings";

// GET /api/v1/GetFormSettings?organizationId=...
app.http('GetFormSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/GetFormSettings',
  handler: GetFormSettings
});

// POST /api/v1/UpdateFormSettings?organizationId=...
app.http('UpdateFormSettings', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'v1/UpdateFormSettings',
  handler: UpdateFormSettings
});
