import { FormSettings, getDefaultFormSettings } from '../models/form-settings.model';
import { FormSettingsRepository } from '../repositories/form-settings.repository';
import { ValidationError } from '../shared/errors';
import { formSettingsSchema } from '../validators/form-settings.validator';
import { FormSettingsRepositoryPort } from '../repositories/form-settings-repository.interface';

export class FormSettingsService {
  constructor(private readonly repository: FormSettingsRepositoryPort) {}

  async get(): Promise<FormSettings> {
    return await this.repository.find() ?? getDefaultFormSettings();
  }

  async save(input: unknown): Promise<FormSettings> {
    const result = formSettingsSchema.safeParse(input);
    if (!result.success) throw new ValidationError(result.error.issues.map((issue) => issue.message).join(', '));

    return this.repository.save({
      id: 'form-settings',
      fields: result.data.fields,
      updatedAt: new Date().toISOString()
    });
  }
}
