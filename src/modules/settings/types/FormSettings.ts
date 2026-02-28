export type FieldType = 'Text' | 'Date' | 'DateTime' | 'Email';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  width: 'full' | 'half';
  groupId?: string;
  position?: 'left' | 'right';
  description?: string;
  required?: boolean;
}

export interface FormSettings {
  id: string; 
  organizationId: string;
  fields: FormField[];
}
