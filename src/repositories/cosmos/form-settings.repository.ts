import type { Container } from '@azure/cosmos';
import type { IFormSettingsRepository } from '../../interfaces/form-settings.repository.interface';
import {
  createActionRow,
  createTemplateRows,
  FORM_SETTINGS_DOCUMENT_ID,
  FORM_SETTINGS_SCHEMA_VERSION,
  flattenFields,
  type FormRow,
  type FormSettings,
} from '../../models/form-settings.model';
import { isCosmosNotFound, stripSystemProperties } from './cosmos.utils';

interface LegacyField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'datetime' | 'email';
  required?: boolean;
  placeholder?: string;
}

/** Version 1 documents: locked built-in fields with renamable labels + custom rows keyed by field id. */
export interface LegacyFormSettings {
  id: string;
  organizationId: string;
  systemFieldLabels?: Record<string, string>;
  rows?: { id: string; fields: LegacyField[] }[];
  updatedAt?: string | null;
}

type StoredFormSettings = FormSettings | LegacyFormSettings;

/**
 * Upgrades a v1 document to v2: the built-in fields become regular template fields (keeping their renamed
 * labels) and custom fields keep their id as key, so values already stored on tasks still match.
 */
export function migrateLegacySettings(legacy: LegacyFormSettings): FormSettings {
  const labels = legacy.systemFieldLabels ?? {};
  // v2 forms had no buttons: the action row is appended at the end by the v2 -> v3 step.
  const templateRows: FormRow[] = createTemplateRows()
    .filter((row) => row.id !== createActionRow().id)
    .map((row) => ({
      ...row,
      fields: row.fields.map((field) => ({ ...field, label: (field.key && labels[field.key]) || field.label })),
    }));
  const customRows: FormRow[] = (legacy.rows ?? []).map((row) => ({
    id: row.id,
    fields: row.fields.map((field) => ({
      id: field.id,
      type: field.type,
      key: field.id,
      label: field.label,
      required: field.required ?? false,
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    })),
  }));

  return {
    id: legacy.id,
    organizationId: legacy.organizationId,
    schemaVersion: 2,
    rows: [...templateRows, ...customRows],
    updatedAt: legacy.updatedAt ?? null,
  };
}

/**
 * Upgrades a v2 document to v3: rows are unchanged and the Submit + Reset buttons of the bpmn.io start form
 * are appended (unless the form already has the action row). Ids are kept unique in the document.
 */
export function migrateV2Settings(settings: FormSettings): FormSettings {
  const actionRow = createActionRow();
  const { rows } = settings;
  if (rows.some((row) => row.id === actionRow.id)) return { ...settings, schemaVersion: 3, rows };

  const usedIds = new Set(flattenFields(rows).map((field) => field.id));
  const uniqueId = (id: string) => {
    let candidate = id;
    for (let suffix = 2; usedIds.has(candidate); suffix += 1) candidate = `${id}_${suffix}`;
    usedIds.add(candidate);
    return candidate;
  };
  const appended = { ...actionRow, fields: actionRow.fields.map((field) => ({ ...field, id: uniqueId(field.id) })) };

  return { ...settings, schemaVersion: 3, rows: [...rows, appended] };
}

/** Documents are migrated on read (v1 -> v2 -> v3); they are written in the current version on the next save. */
function toFormSettings(resource: StoredFormSettings): FormSettings {
  const document = stripSystemProperties(resource);
  let settings: FormSettings =
    'schemaVersion' in document && document.schemaVersion >= 2
      ? { ...document, rows: document.rows ?? [] }
      : migrateLegacySettings(document as LegacyFormSettings);
  if (settings.schemaVersion < FORM_SETTINGS_SCHEMA_VERSION) settings = migrateV2Settings(settings);
  return settings;
}

/** One settings document per organization, stored in a container partitioned by `/organizationId`. */
export class CosmosFormSettingsRepository implements IFormSettingsRepository {
  constructor(private readonly container: Container) {}

  async findByOrganization(organizationId: string): Promise<FormSettings | null> {
    try {
      const { resource } = await this.container
        .item(FORM_SETTINGS_DOCUMENT_ID, organizationId)
        .read<StoredFormSettings>();
      return resource ? toFormSettings(resource) : null;
    } catch (error) {
      if (isCosmosNotFound(error)) return null;
      throw error;
    }
  }

  async upsert(settings: FormSettings): Promise<FormSettings> {
    const { resource } = await this.container.items.upsert<FormSettings>(settings);
    return toFormSettings(resource ?? settings);
  }
}
