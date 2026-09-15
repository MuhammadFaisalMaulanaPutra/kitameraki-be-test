import type { FieldDefinition, FormSettingsInput } from './models';

export const SYSTEM_FIELD_IDS = [
  'title',
  'description',
  'dueDate',
  'priority',
  'status',
  'tags',
] as const;

export const SYSTEM_FIELDS: FieldDefinition[] = [
  { id: 'title', label: 'Title', kind: 'system', type: 'text', required: true },
  {
    id: 'description',
    label: 'Description',
    kind: 'system',
    type: 'textarea',
    required: false,
  },
  {
    id: 'dueDate',
    label: 'Due date',
    kind: 'system',
    type: 'datetime',
    required: false,
  },
  {
    id: 'priority',
    label: 'Priority',
    kind: 'system',
    type: 'select',
    required: false,
  },
  {
    id: 'status',
    label: 'Status',
    kind: 'system',
    type: 'select',
    required: true,
  },
  { id: 'tags', label: 'Tags', kind: 'system', type: 'tags', required: false },
];

export const DEFAULT_FORM_SETTINGS: FormSettingsInput = {
  fields: SYSTEM_FIELDS,
  rows: [
    { id: 'row-title', fieldIds: ['title'] },
    { id: 'row-description', fieldIds: ['description'] },
    { id: 'row-schedule', fieldIds: ['dueDate', 'priority'] },
    { id: 'row-status', fieldIds: ['status', 'tags'] },
  ],
};

export const SYSTEM_FIELD_TYPES = Object.fromEntries(
  SYSTEM_FIELDS.map((field) => [field.id, field.type]),
);
export const SYSTEM_FIELD_REQUIRED = Object.fromEntries(
  SYSTEM_FIELDS.map((field) => [field.id, field.required]),
);
