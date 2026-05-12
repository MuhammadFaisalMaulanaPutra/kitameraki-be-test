export type FieldType = 'text' | 'date' | 'datetime' | 'email';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  column: 0 | 1;
  order: number;
}

export interface FormSettings {
  organizationId: number;
  fields: FormField[];
  updatedAt: string;
}

export interface FormSettingsDocument extends FormSettings {
  id: string;
  createdAt: string;
}
