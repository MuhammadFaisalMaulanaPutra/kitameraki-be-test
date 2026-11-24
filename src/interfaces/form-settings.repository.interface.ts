import type { FormSettings } from '../models/form-settings.model';

export interface IFormSettingsRepository {
  findByOrganization(organizationId: string): Promise<FormSettings | null>;
  upsert(settings: FormSettings): Promise<FormSettings>;
}
