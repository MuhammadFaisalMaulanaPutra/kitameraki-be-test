/**
 * @file UpsertSettings.ts
 * @description Azure Function handler for creating or replacing the global
 * form configuration (custom fields).
 *
 * Endpoint:  PUT /api/settings
 *
 * Request body:  UpsertSettingsRequest — { customFields: CustomField[] }
 * Response:      The saved GlobalSettings document (200 OK).
 *
 * Implementation notes:
 *  - Cosmos DB's `upsert()` operation is used so the caller does not need to
 *    know whether a settings document already exists; it will be created on
 *    the first call and overwritten on subsequent calls.
 *  - The entire `customFields` array is replaced atomically. Partial updates
 *    (e.g. adding a single field) are the responsibility of the front-end,
 *    which should always send the complete current configuration.
 *  - `updatedAt` is set server-side to provide an audit trail.
 *  - The document `id` and `type` discriminator are always set by the server
 *    and cannot be overridden by the client payload.
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { GlobalSettings } from "../models/models";
import { ok, badRequest, internalError } from "../utils/responseHelpers";
import { validateUpsertSettingsRequest } from "../utils/validators";

/** Fixed document ID and partition key for the global settings document. */
const SETTINGS_DOC_ID = "GLOBAL_SETTINGS";

export async function UpsertSettings(
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

    const validationError = validateUpsertSettingsRequest(body);
    if (validationError) {
      return badRequest(validationError);
    }

    const requestData = body as { customFields: GlobalSettings["customFields"] };

    // -----------------------------------------------------------------------
    // 2. Build the settings document — server controls id, type, and updatedAt
    // -----------------------------------------------------------------------
    const settingsDocument: GlobalSettings = {
      id: SETTINGS_DOC_ID,
      type: "system_config",
      customFields: requestData.customFields,
      updatedAt: new Date().toISOString(),
    };

    // -----------------------------------------------------------------------
    // 3. Upsert — create if absent, replace if present (atomic)
    // -----------------------------------------------------------------------
    const { resource } = await container.items.upsert<GlobalSettings>(settingsDocument);

    context.log(
      `Global settings upserted. customFields count=${settingsDocument.customFields.length}`
    );

    return ok(resource);
  } catch (error) {
    context.error("Error saving global settings:", error);
    return internalError("saving the global settings");
  }
}

app.http("UpsertSettings", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "settings",
  handler: UpsertSettings,
});
