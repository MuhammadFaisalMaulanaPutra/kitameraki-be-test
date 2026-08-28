export const FORM_FIELD_TYPES = ['text', 'date', 'datetime', 'email'] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  isSystem: boolean;
  required: boolean;
  showInTable: boolean;
  row: number;
  column: 1 | 2;
  order: number;
}

export interface FormSettings {
  id: 'task-form';
  organizationId: string;
  version: number;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export const SYSTEM_FORM_FIELDS: readonly FormField[] = [
  {
    id: 'title',
    key: 'title',
    label: 'Title',
    type: 'text',
    isSystem: true,
    required: true,
    showInTable: true,
    row: 1,
    column: 1,
    order: 1,
  },
  {
    id: 'status',
    key: 'status',
    label: 'Status',
    type: 'text',
    isSystem: true,
    required: true,
    showInTable: true,
    row: 1,
    column: 2,
    order: 2,
  },
  {
    id: 'description',
    key: 'description',
    label: 'Description',
    type: 'text',
    isSystem: true,
    required: false,
    showInTable: true,
    row: 2,
    column: 1,
    order: 3,
  },
  {
    id: 'dueDate',
    key: 'dueDate',
    label: 'Due Date',
    type: 'datetime',
    isSystem: true,
    required: false,
    showInTable: true,
    row: 2,
    column: 2,
    order: 4,
  },
  {
    id: 'priority',
    key: 'priority',
    label: 'Priority',
    type: 'text',
    isSystem: true,
    required: false,
    showInTable: true,
    row: 3,
    column: 1,
    order: 5,
  },
  {
    id: 'tags',
    key: 'tags',
    label: 'Tags',
    type: 'text',
    isSystem: true,
    required: false,
    showInTable: true,
    row: 3,
    column: 2,
    order: 6,
  },
] as const;

export const SYSTEM_FIELD_IDS = new Set(SYSTEM_FORM_FIELDS.map((field) => field.id));

export function createDefaultFormSettings(organizationId: string, now = new Date().toISOString()): FormSettings {
  return {
    id: 'task-form',
    organizationId,
    version: 1,
    fields: SYSTEM_FORM_FIELDS.map((field) => ({ ...field })),
    createdAt: now,
    updatedAt: now,
  };
}
