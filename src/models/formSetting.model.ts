export const FORM_SETTINGS_DOC_ID = 'form-settings';

export type FieldType = 'text' | 'date' | 'datetime' | 'email';

export interface FormFieldSetting {
    id: string;
    key: string;
    label: string;
    type: FieldType;
    row: number;
    column: 1 | 2;
    required?: boolean;
}

export interface FormSetting {
    id: string;
    organizationId: string;
    fields: FormFieldSetting[];
    updatedAt?: string;
}