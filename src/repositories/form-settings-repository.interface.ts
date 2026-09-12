import { FormSettings } from '../models/form-settings.model';

export interface FormSettingsRepositoryPort {
  find(): Promise<FormSettings | undefined>;
  save(settings: FormSettings): Promise<FormSettings>;
}
