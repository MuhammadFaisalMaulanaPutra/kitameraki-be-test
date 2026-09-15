export type FormFieldType = "text" | "textarea" | "select" | "date" | "datetime" | "email" | "tags";

// Custom fields (added by the organization) are limited to the simple input
// types called out in the spec; the richer types below are reserved for the
// built-in Part 1 fields (status/priority selects, description textarea...).
export const CUSTOM_FIELD_TYPES: readonly FormFieldType[] = ["text", "date", "datetime", "email"];

export type FormFieldWidth = "half" | "full";

export interface FormFieldConfig {
    id: string;
    // Property this field reads/writes on the Task: one of the built-in
    // Task keys for default fields, or "customFields.<name>" for a custom one.
    key: string;
    label: string;
    type: FormFieldType;
    width: FormFieldWidth;
    isCustom: boolean;
    required?: boolean;
    options?: string[];
}

export interface FormSettings {
    id: string;
    organizationId: string;
    fields: FormFieldConfig[];
}

// The Part 1 fields, in their default order/labels. Their `id`/`key` must
// stay stable since tasks store values under these keys.
export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
    { id: "title", key: "title", label: "Title", type: "text", width: "full", isCustom: false, required: true },
    { id: "description", key: "description", label: "Description", type: "textarea", width: "full", isCustom: false },
    { id: "dueDate", key: "dueDate", label: "Due Date", type: "date", width: "half", isCustom: false },
    { id: "priority", key: "priority", label: "Priority", type: "select", width: "half", isCustom: false, options: ["low", "medium", "high"] },
    { id: "status", key: "status", label: "Status", type: "select", width: "half", isCustom: false, required: true, options: ["todo", "in-progress", "completed"] },
    { id: "tags", key: "tags", label: "Tags", type: "tags", width: "half", isCustom: false },
];

export const DEFAULT_FORM_FIELD_IDS = new Set(DEFAULT_FORM_FIELDS.map((field) => field.id));

export function defaultFormSettings(organizationId: string): FormSettings {
    return {
        id: organizationId,
        organizationId,
        fields: DEFAULT_FORM_FIELDS,
    };
}
