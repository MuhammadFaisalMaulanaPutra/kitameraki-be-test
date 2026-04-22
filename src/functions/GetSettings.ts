/**
 * @file GetSettings.ts
 * @description Azure Function handler for retrieving the global form configuration.
 *
 * Endpoint:  GET /api/settings
 *
 * Response:  GlobalSettings document (200) or an empty settings object if none
 *            has been saved yet.
 *
 * Implementation notes:
 *  - Settings are stored as a single Cosmos DB document with a fixed id of
 *    "GLOBAL_SETTINGS", using the same partition key. This means a point read
 *    (O(1)) is sufficient — no query is needed.
 *  - When no settings document exists yet, the handler returns a default
 *    empty-state object rather than a 404, because the front-end settings page
 *    should always be renderable even before any configuration has been saved.
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { GlobalSettings } from "../models/models";
import { ok, internalError } from "../utils/responseHelpers";

/** The fixed document ID and partition key for the global settings document. */
const SETTINGS_DOC_ID = "GLOBAL_SETTINGS";

/** Default settings returned when no configuration has been saved yet. */
const DEFAULT_SETTINGS: GlobalSettings = {
  id: SETTINGS_DOC_ID,
  type: "system_config",
  customFields: [],
};

export async function GetSettings(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { resource } = await container
      .item(SETTINGS_DOC_ID, SETTINGS_DOC_ID)
      .read<GlobalSettings>();

    // If the settings document does not yet exist, return a sensible default.
    if (!resource) {
      return ok(DEFAULT_SETTINGS);
    }

    return ok(resource);
  } catch (error: unknown) {
    // A 404 from Cosmos simply means no settings have been saved yet.
    // Return the default rather than an error.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === 404
    ) {
      return ok(DEFAULT_SETTINGS);
    }

    context.error("Error fetching global settings:", error);
    return internalError("fetching the global settings");
  }
}

app.http("GetSettings", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "settings",
  handler: GetSettings,
});
