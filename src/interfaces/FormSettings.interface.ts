export type FieldType = "text" | "date" | "datetime" | "email";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  column: number; // 0 or 1 for 2-column layout
  order: number; // Order within the column
}

export interface FormSettings {
  organizationId: number;
  fields: FormField[];
  updatedAt: Date;
}

export interface IFormSettingsDBStruct extends FormSettings {
  id: string;
  createdAt: Date;
}
