import { getFormSettingsContainer } from '../cosmos/client';
import { isCosmosNotFound } from '../cosmos/errors';
import { FormFieldDef } from '../domain/formFields';

/**
 * One settings document per organization: `id === organizationId` so the form
 * config is a single, predictable read/upsert (no query needed).
 */
export interface FormSettings {
  id: string;
  organizationId: string;
  fields: FormFieldDef[];
  updatedAt: string;
}

export async function getFormSettings(organizationId: string): Promise<FormSettings | undefined> {
  try {
    const { resource } = await getFormSettingsContainer()
      .item(organizationId, organizationId)
      .read<FormSettings>();
    return resource;
  } catch (error) {
    if (isCosmosNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function upsertFormSettings(
  organizationId: string,
  fields: FormFieldDef[],
): Promise<FormSettings> {
  const doc: FormSettings = {
    id: organizationId,
    organizationId,
    fields,
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await getFormSettingsContainer().items.upsert<FormSettings>(doc);
  return resource as FormSettings;
}
