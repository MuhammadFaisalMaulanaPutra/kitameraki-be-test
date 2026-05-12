import { CosmosClient } from '@azure/cosmos';
import { DB_NAME, FORM_SETTINGS_CONTAINER } from '../libs/cosmosClient';
import { FormSettings, FormSettingsDocument } from '../interfaces/formSettings';

function container(client: CosmosClient) {
  return client.database(DB_NAME).container(FORM_SETTINGS_CONTAINER);
}

export async function getFormSettings(
  client: CosmosClient,
  organizationId: number
): Promise<FormSettingsDocument | null> {
  const { resources } = await container(client).items.query<FormSettingsDocument>({
    query: 'SELECT * FROM c WHERE c.organizationId = @organizationId',
    parameters: [{ name: '@organizationId', value: organizationId }],
  }).fetchAll();
  return resources[0] ?? null;
}

export async function upsertFormSettings(
  client: CosmosClient,
  data: FormSettings
): Promise<FormSettingsDocument> {
  const existing = await getFormSettings(client, data.organizationId);
  const doc: FormSettingsDocument = {
    ...data,
    id: existing?.id ?? String(data.organizationId),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await container(client).items.upsert<FormSettingsDocument>(doc);
  if (!resource) throw new Error('Failed to upsert form settings');
  return resource;
}
