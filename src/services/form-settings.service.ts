import type { IFormSettingsRepository } from '../interfaces/form-settings.repository.interface';
import {
  createTemplateRows,
  FORM_SETTINGS_DOCUMENT_ID,
  FORM_SETTINGS_SCHEMA_VERSION,
  type FormRow,
  type FormSettings,
} from '../models/form-settings.model';
import type { UpdateFormSettingsInput } from '../validators/form-settings.validator';

/** Settings used until the organization saves its own form: the task template. */
export function createDefaultFormSettings(organizationId: string): FormSettings {
  return {
    id: FORM_SETTINGS_DOCUMENT_ID,
    organizationId,
    schemaVersion: FORM_SETTINGS_SCHEMA_VERSION,
    rows: createTemplateRows(),
    updatedAt: null,
  };
}

export class FormSettingsService {
  constructor(
    private readonly formSettingsRepository: IFormSettingsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Returns the stored settings, or the template when the organization has never saved any. */
  async getSettings(organizationId: string): Promise<FormSettings> {
    const stored = await this.formSettingsRepository.findByOrganization(organizationId);
    return stored ?? createDefaultFormSettings(organizationId);
  }

  async updateSettings(organizationId: string, input: UpdateFormSettingsInput): Promise<FormSettings> {
    return this.formSettingsRepository.upsert({
      id: FORM_SETTINGS_DOCUMENT_ID,
      organizationId,
      schemaVersion: FORM_SETTINGS_SCHEMA_VERSION,
      ...(input.versionTag ? { versionTag: input.versionTag } : {}),
      rows: input.rows,
      updatedAt: this.now().toISOString(),
    });
  }

  /** The component tree of the task form (rows of components; groups and dynamic lists hold rows). */
  async getRows(organizationId: string): Promise<FormRow[]> {
    const settings = await this.getSettings(organizationId);
    return settings.rows;
  }
}
