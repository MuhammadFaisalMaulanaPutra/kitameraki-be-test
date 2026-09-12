import { Container } from '@azure/cosmos';
import { FormSettings } from '../models/form-settings.model';
import { isCosmosNotFound } from '../shared/errors';
import { FormSettingsRepositoryPort } from './form-settings-repository.interface';

const settingsId = 'form-settings';

export class FormSettingsRepository implements FormSettingsRepositoryPort {
  constructor(private readonly container: Container) {}

  async find(): Promise<FormSettings | undefined> {
    try {
      const { resource } = await this.container.item(settingsId, settingsId).read<FormSettings>();
      return resource;
    } catch (error) {
      if (isCosmosNotFound(error)) return undefined;
      throw error;
    }
  }

  async save(settings: FormSettings): Promise<FormSettings> {
    const { resource } = await this.container.items.upsert<FormSettings>(settings);
    if (!resource) throw new Error('Cosmos DB did not return the saved form settings');
    return resource;
  }
}
