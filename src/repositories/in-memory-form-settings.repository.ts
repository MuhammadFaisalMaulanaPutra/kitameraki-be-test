import { FormSettings } from '../models/form-settings.model';
import { FormSettingsRepositoryPort } from './form-settings-repository.interface';

export class InMemoryFormSettingsRepository implements FormSettingsRepositoryPort {
  private settings?: FormSettings;

  async find(): Promise<FormSettings | undefined> {
    return this.settings;
  }

  async save(settings: FormSettings): Promise<FormSettings> {
    this.settings = settings;
    return settings;
  }
}
