import { createDefaultFormSettings, FormField, FormSettings } from '../domain/formSettings';
import { ValidationError } from '../errors/AppError';
import { FormSettingsRepository } from '../repositories/contracts';
import { validateFormFields } from '../validation/formSettingsValidation';

export class FormSettingsService {
  constructor(private readonly repository: FormSettingsRepository) {}

  async get(organizationId: string): Promise<FormSettings> {
    return (await this.repository.get(organizationId)) ?? createDefaultFormSettings(organizationId);
  }

  async save(organizationId: string, fields: FormField[]): Promise<FormSettings> {
    validateFormFields(fields);
    const existing = await this.repository.get(organizationId);
    validateCompatibleFieldEvolution(existing, fields);
    const now = new Date().toISOString();
    const settings: FormSettings = {
      id: 'task-form',
      organizationId,
      version: (existing?.version ?? 0) + 1,
      fields: fields.map((field) => ({ ...field })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    return this.repository.save(settings);
  }
}

function validateCompatibleFieldEvolution(existing: FormSettings | null, nextFields: FormField[]): void {
  if (!existing) return;

  const nextById = new Map(nextFields.map((field) => [field.id, field]));
  for (const previous of existing.fields.filter((field) => !field.isSystem)) {
    const next = nextById.get(previous.id);
    if (next && next.type !== previous.type) {
      throw new ValidationError([
        {
          field: `fields.${previous.id}.type`,
          message: 'Changing the type of an existing custom field is not allowed because it can invalidate historical task values.',
        },
      ]);
    }
  }
}
