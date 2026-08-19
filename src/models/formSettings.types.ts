export type CustomFieldType = 'text' | 'date' | 'datetime' | 'email';

/**
 * A single custom field appended to the end of the base task form.
 * The built-in Part 1 fields (title, description, dueDate, priority,
 * status, tags) are not represented here — this only covers the
 * additional fields an org can configure on top of them.
 */
export interface CustomFieldConfig {
    id: string;
    label: string;
    type: CustomFieldType;
    row: number;
    column: 1 | 2;
}

/**
 * Full FormSettings entity as stored in Cosmos DB.
 * One document per organization; `id` equals `organizationId` so an
 * upsert always targets the single existing document for that org.
 * Kept in sync with `formSettings.schema.json` at the repo root.
 */
export interface FormSettings {
    id: string;
    organizationId: string;
    fields: CustomFieldConfig[];
    updatedAt: string;
}

/**
 * Fields a client is allowed to send when replacing the form
 * settings for their organization. `id`, `organizationId` and
 * `updatedAt` are all server-controlled.
 */
export type UpdateFormSettingsInput = {
    fields: Array<Omit<CustomFieldConfig, 'id'> & { id?: string }>;
};
