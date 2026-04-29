import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getInitializedCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { getFormSettings } from "../services/formSettingsService";
import { validateOrganizationId } from "../validators/parametersValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * GetFormSettings function - Retrieves form settings for an organization
 * Query parameters:
 *   - organizationId (required): Organization ID
 */
export async function GetFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("GetFormSettings");

  try {
    logger.info("Processing GetFormSettings request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );

    // Get Cosmos client and fetch data
    const client = await getInitializedCosmosClient();
    const formSettings = await getFormSettings(client, organizationId);

    logger.info("Successfully retrieved form settings", { organizationId });

    // If no settings exist, return default empty settings
    const response = createSuccessResponse(
      formSettings || { organizationId, fields: [], updatedAt: new Date() },
      HTTP_STATUS.OK
    );
    return {
      jsonBody: response,
      status: response.status,
    };
  } catch (e) {
    if (e instanceof AppError) {
      logger.error(e.message, e, { code: e.code });
      const errorResponse = createErrorResponse(e, e.status);
      return {
        jsonBody: errorResponse,
        status: errorResponse.status,
      };
    }

    logger.error("Unexpected error", e as Error);
    const errorResponse = createErrorResponse(
      "Internal Server Error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return {
      jsonBody: errorResponse,
      status: errorResponse.status,
    };
  }
}

app.http("GetFormSettings", {
  methods: ["GET"],
  authLevel: "function",
  handler: GetFormSettings,
});
