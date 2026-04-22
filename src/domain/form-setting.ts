export type FieldType = "string" | "datetime" | "date" | "email";

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    order?: number;
    isFullWidth?: boolean;
}

export class FormSetting {
    constructor(
        public id: string,
        public organizationId: string,
        public fields: FormField[]
    ) {}

    static create(data: Partial<FormSetting>): FormSetting {
        return new FormSetting(
            data.id || crypto.randomUUID(),
            data.organizationId!,
            data.fields || []
        );
    }
}