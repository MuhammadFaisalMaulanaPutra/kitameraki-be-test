import { FormSettings } from '../../domain/formSettings';
import { FormSettingsRepository } from '../contracts';
import { getFormSettingsContainer } from './cosmosClient';

export class CosmosFormSettingsRepository implements FormSettingsRepository {
  async get(organizationId: string): Promise<FormSettings | null> {
    try {
      const response = await getFormSettingsContainer().item('task-form', organizationId).read<FormSettings>();
      return response.resource ?? null;
    } catch (error) {
      if (getStatusCode(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async save(settings: FormSettings): Promise<FormSettings> {
    const response = await getFormSettingsContainer().items.upsert<FormSettings>(settings);
    if (!response.resource) {
      throw new Error('Cosmos DB did not return the saved form settings.');
    }
    return response.resource;
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as { code?: unknown; statusCode?: unknown };
  if (typeof candidate.code === 'number') return candidate.code;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  return undefined;
}
