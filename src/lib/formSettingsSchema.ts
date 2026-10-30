import { z } from "zod";

export const fieldTypeSchema = z.enum(["text", "date", "datetime", "email"]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export interface FormFieldDefinition {
    id: string;
    label: string;
    type: FieldType;
    builtIn: boolean;
}

export const builtInFields: FormFieldDefinition[] = [
    { id: "title", label: "Title", type: "text", builtIn: true },
    { id: "description", label: "Description", type: "text", builtIn: true },
    { id: "dueDate", label: "Due date", type: "datetime", builtIn: true },
    { id: "priority", label: "Priority", type: "text", builtIn: true },
    { id: "status", label: "Status", type: "text", builtIn: true },
    { id: "tags", label: "Tags", type: "text", builtIn: true }
];

const builtInFieldsById = new Map(builtInFields.map(field => [field.id, field]));

const fieldSchema = z.strictObject({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(100),
    type: fieldTypeSchema,
    builtIn: z.boolean()
});

const rowSchema = z.strictObject({
    id: z.string().trim().min(1).max(100),
    fieldIds: z.array(z.string().trim().min(1).max(100)).min(1).max(2)
});

export const formSettingsInputSchema = z.strictObject({
    rows: z.array(rowSchema).min(1),
    fields: z.array(fieldSchema).min(1)
}).superRefine((settings, ctx) => {
    const fieldIds = new Set<string>();
    for (const [index, field] of settings.fields.entries()) {
        if (fieldIds.has(field.id)) {
            ctx.addIssue({
                code: "custom",
                message: "Field ids must be unique.",
                path: ["fields", index, "id"]
            });
        }
        fieldIds.add(field.id);

        const builtIn = builtInFieldsById.get(field.id);
        if (builtIn && field.type !== builtIn.type) {
            ctx.addIssue({
                code: "custom",
                message: "Built-in field types cannot be changed.",
                path: ["fields", index, "type"]
            });
        }
        if (builtIn && !field.builtIn) {
            ctx.addIssue({
                code: "custom",
                message: "Built-in fields must remain marked as built-in.",
                path: ["fields", index, "builtIn"]
            });
        }
        if (!builtIn && field.builtIn) {
            ctx.addIssue({
                code: "custom",
                message: "Custom fields must not be marked as built-in.",
                path: ["fields", index, "builtIn"]
            });
        }
    }

    for (const builtIn of builtInFields) {
        if (!fieldIds.has(builtIn.id)) {
            ctx.addIssue({
                code: "custom",
                message: "Built-in fields cannot be removed.",
                path: ["fields"]
            });
        }
    }

    const rowIds = new Set<string>();
    const placedFieldIds = new Set<string>();
    for (const [rowIndex, row] of settings.rows.entries()) {
        if (rowIds.has(row.id)) {
            ctx.addIssue({
                code: "custom",
                message: "Row ids must be unique.",
                path: ["rows", rowIndex, "id"]
            });
        }
        rowIds.add(row.id);

        for (const [fieldIndex, fieldId] of row.fieldIds.entries()) {
            if (!fieldIds.has(fieldId)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Field id referenced by row does not exist.",
                    path: ["rows", rowIndex, "fieldIds", fieldIndex]
                });
            } else if (placedFieldIds.has(fieldId)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Each field must appear in exactly one row.",
                    path: ["rows", rowIndex, "fieldIds", fieldIndex]
                });
            }
            placedFieldIds.add(fieldId);
        }
    }

    for (const fieldId of fieldIds) {
        if (!placedFieldIds.has(fieldId)) {
            ctx.addIssue({
                code: "custom",
                message: "Every field must appear in a row.",
                path: ["rows"]
            });
        }
    }
});

export const customFieldValueSchemas = {
    text: z.string().max(1000),
    date: z.iso.date(),
    datetime: z.iso.datetime({ offset: true }),
    email: z.email()
};

export type FormSettingsInput = z.infer<typeof formSettingsInputSchema>;
