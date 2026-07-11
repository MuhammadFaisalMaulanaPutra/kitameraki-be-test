import { FieldType } from '../config/constants';

export interface FormFieldConfig {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  column: number;
  row: number;
}

export interface FormConfig {
  id: string;
  organizationId: string;
  fields: FormFieldConfig[];
  columnsPerRow: number;
  updatedAt: string;
}

export type SaveFormConfigPayload = Omit<FormConfig, 'id' | 'organizationId' | 'updatedAt'>;
