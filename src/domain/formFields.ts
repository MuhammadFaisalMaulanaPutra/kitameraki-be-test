/**
 * The form-settings model shared by the whole task app (Part 2).
 *
 * A form is a list of rows, each holding up to two fields side by side:
 * `order` is the row index (fields sharing an `order` sit in the same row),
 * `column` (1 or 2) picks the slot within that row. Base fields map to the
 * Part-1 task properties and are always present; custom fields are user-defined
 * and appended after them. `select` / `tags` are only used by base fields — the
 * custom-field palette exposes just the four types required by the spec (see
 * CUSTOM_FIELD_TYPES).
 */
export type FormFieldType = 'text' | 'date' | 'datetime' | 'email' | 'select' | 'tags';

export interface FormFieldDef {
  id: string;
  /** Property name on the task document. */
  key: string;
  label: string;
  type: FormFieldType;
  column: 1 | 2;
  /** Row index; fields sharing this value are placed on the same row. */
  order: number;
  required?: boolean;
  isBase?: boolean;
}

/** Field types a user may pick when adding a new custom field. */
export const CUSTOM_FIELD_TYPES: FormFieldType[] = ['text', 'date', 'datetime', 'email'];

/** Base fields must always exist so tasks stay valid. */
export const REQUIRED_BASE_KEYS = ['title', 'status'] as const;

/** Default layout returned when an organization has not configured a form yet. */
export const DEFAULT_FORM_FIELDS: FormFieldDef[] = [
  { id: 'base-title', key: 'title', label: 'Title', type: 'text', column: 1, order: 0, required: true, isBase: true },
  { id: 'base-status', key: 'status', label: 'Status', type: 'select', column: 2, order: 0, required: true, isBase: true },
  { id: 'base-description', key: 'description', label: 'Description', type: 'text', column: 1, order: 1, isBase: true },
  { id: 'base-priority', key: 'priority', label: 'Priority', type: 'select', column: 2, order: 1, isBase: true },
  { id: 'base-dueDate', key: 'dueDate', label: 'Due Date', type: 'datetime', column: 1, order: 2, isBase: true },
  { id: 'base-tags', key: 'tags', label: 'Tags', type: 'tags', column: 2, order: 2, isBase: true },
];
