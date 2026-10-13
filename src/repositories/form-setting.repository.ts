import { formSettingsContainer } from "@/database/cosmosClient";
import { FormSetting } from "@/schemas/form-setting.schema";
import { isCosmosNotFoundError } from "@/utils/errors";

const SETTING_ITEM_ID = "default";

export async function findByOrganizationId(organizationId: string): Promise<FormSetting | null> {
  try {
    const { resource } = await formSettingsContainer
      .item(SETTING_ITEM_ID, organizationId)
      .read<FormSetting>();
    return resource ?? null;
  } catch (error: unknown) {
    if (isCosmosNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function upsert(setting: FormSetting): Promise<FormSetting> {
  const itemToSave = {
    ...setting,
    id: SETTING_ITEM_ID,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await formSettingsContainer.items.upsert<FormSetting>(itemToSave);
  if (!resource) {
    throw new Error("Failed to save form settings in Cosmos DB");
  }
  return resource;
}
