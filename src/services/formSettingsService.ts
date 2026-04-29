/**
 * Form Settings Service
 * Handles all Cosmos DB operations for form settings
 */

import { CosmosClient } from "@azure/cosmos";
import { DB_CONFIG } from "../constants";
import { FormSettings, IFormSettingsDBStruct } from "../interfaces/FormSettings.interface";

/**
 * Gets the database container for form settings
 * @param client - Cosmos DB client
 * @returns Form settings container reference
 */
function getFormSettingsContainer(client: CosmosClient) {
  return client
    .database(DB_CONFIG.DATABASE_NAME)
    .container(DB_CONFIG.FORM_SETTINGS_CONTAINER_NAME);
}

/**
 * Retrieves form settings for an organization
 * @param client - Cosmos DB client
 * @param organizationId - Organization ID
 * @returns Form settings or null if not found
 */
export async function getFormSettings(
  client: CosmosClient,
  organizationId: number
): Promise<IFormSettingsDBStruct | null> {
  const container = getFormSettingsContainer(client);

  try {
    const query = {
      query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
      parameters: [
        {
          name: "@organizationId",
          value: organizationId,
        },
      ],
    };

    const { resources } = await container.items.query<IFormSettingsDBStruct>(query).fetchAll();

    if (resources.length === 0) {
      return null;
    }

    return resources[0];
  } catch (e: any) {
    if (e.code === 404) {
      return null;
    }
    throw e;
  }
}

/**
 * Creates or updates form settings for an organization
 * @param client - Cosmos DB client
 * @param formSettings - Form settings data
 * @returns Created or updated form settings
 */
export async function upsertFormSettings(
  client: CosmosClient,
  formSettings: FormSettings
): Promise<IFormSettingsDBStruct> {
  const container = getFormSettingsContainer(client);

  // Check if settings already exist
  const existing = await getFormSettings(client, formSettings.organizationId);

  const toUpsert: IFormSettingsDBStruct = {
    ...formSettings,
    id: existing?.id || `${formSettings.organizationId}`,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  const { resource } = await container.items.upsert<IFormSettingsDBStruct>(toUpsert);

  if (!resource) {
    throw new Error("Failed to upsert form settings");
  }

  return resource;
}
