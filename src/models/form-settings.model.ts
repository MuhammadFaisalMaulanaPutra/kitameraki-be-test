export const formFieldTypes = ['text', 'date', 'datetime', 'email'] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  visible: boolean;
  required: boolean;
  column: 1 | 2;
  order: number;
  system: boolean;
}

export interface FormSettings {
  id: 'form-settings';
  fields: FormField[];
  updatedAt: string;
}

export const defaultFormFields: FormField[] = [
  { id: 'title', key: 'title', label: 'Title', type: 'text', visible: true, required: true, column: 1, order: 0, system: true },
  { id: 'description', key: 'description', label: 'Description', type: 'text', visible: true, required: false, column: 1, order: 1, system: true },
  { id: 'status', key: 'status', label: 'Status', type: 'text', visible: true, required: true, column: 2, order: 2, system: true },
  { id: 'priority', key: 'priority', label: 'Priority', type: 'text', visible: true, required: true, column: 2, order: 3, system: true },
  { id: 'dueDate', key: 'dueDate', label: 'Due date', type: 'datetime', visible: true, required: false, column: 2, order: 4, system: true }
];

export function getDefaultFormSettings(): FormSettings {
  return {
    id: 'form-settings',
    fields: defaultFormFields.map((field) => ({ ...field })),
    updatedAt: new Date().toISOString()
  };
}
