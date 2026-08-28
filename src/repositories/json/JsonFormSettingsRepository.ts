import path from 'node:path';
import { FormSettings } from '../../domain/formSettings';
import { FormSettingsRepository } from '../contracts';
import { JsonFileStore } from './JsonFileStore';

export class JsonFormSettingsRepository implements FormSettingsRepository {
  private readonly store: JsonFileStore<FormSettings>;

  constructor(dataDirectory: string) {
    this.store = new JsonFileStore<FormSettings>(path.join(dataDirectory, 'form-settings.json'));
  }

  async get(organizationId: string): Promise<FormSettings | null> {
    const settings = await this.store.read();
    return settings.find((item) => item.organizationId === organizationId) ?? null;
  }

  async save(settings: FormSettings): Promise<FormSettings> {
    return this.store.update((items) => {
      const index = items.findIndex((item) => item.organizationId === settings.organizationId);
      if (index >= 0) {
        items[index] = settings;
      } else {
        items.push(settings);
      }
      return settings;
    });
  }
}
