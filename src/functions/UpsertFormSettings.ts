import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getInitializedCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { upsertFormSettings } from "../services/formSettingsService";
import { validateOrganizationId } from "../validators/parametersValidator";
import { validateFormSettingsBody } from "../validators/formSettingsValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * UpsertFormSettings function - Creates or updates form settings for an organization
 * Query parameters:
 *   - organizationId (required): Organization ID
 * Body:
 *   - fields (required): Array of form field configurations
 */
export async function UpsertFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("UpsertFormSettings");

  try {
    logger.info("Processing UpsertFormSettings request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );

    // Parse and validate request body
    const body = (await request.json()) as any;
    const validatedData = validateFormSettingsBody(body);

    // Build form settings object
    const formSettings = {
      organizationId,
      fields: validatedData.fields,
      updatedAt: new Date(),
    };

    // Upsert form settings in database
    const client = await getInitializedCosmosClient();
    const upsertedSettings = await upsertFormSettings(client, formSettings);

    logger.info("Form settings upserted successfully", { organizationId });

    const response = createSuccessResponse(upsertedSettings, HTTP_STATUS.OK);
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

    if (e instanceof Error && e.message.includes("field")) {
      logger.error(e.message, e);
      const errorResponse = createErrorResponse(
        e.message,
        HTTP_STATUS.BAD_REQUEST
      );
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

app.http("UpsertFormSettings", {
  methods: ["POST", "PUT"],
  authLevel: "function",
  handler: UpsertFormSettings,
});
