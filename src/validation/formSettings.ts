import { CUSTOM_FIELD_TYPES, DEFAULT_FORM_FIELD_IDS, FormFieldConfig, FormFieldWidth } from "../models/formSettings";

const MAX_FIELDS = 50;
const WIDTHS: readonly FormFieldWidth[] = ["half", "full"];
const CUSTOM_FIELD_KEY_REGEX = /^customFields\.[A-Za-z0-9_-]{1,50}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateField(value: unknown, index: number, errors: string[]): FormFieldConfig | undefined {
    if (!isRecord(value)) {
        errors.push(`fields[${index}] must be an object`);
        return undefined;
    }

    const { id, key, label, type, width, isCustom, required, options } = value;

    if (typeof id !== "string" || id.length === 0) {
        errors.push(`fields[${index}].id is required and must be a non-empty string`);
    }
    if (typeof label !== "string" || label.length === 0 || label.length > 100) {
        errors.push(`fields[${index}].label must be a non-empty string of at most 100 characters`);
    }
    if (typeof isCustom !== "boolean") {
        errors.push(`fields[${index}].isCustom must be a boolean`);
    }
    if (width !== undefined && !WIDTHS.includes(width as FormFieldWidth)) {
        errors.push(`fields[${index}].width must be one of: ${WIDTHS.join(", ")}`);
    }
    if (required !== undefined && typeof required !== "boolean") {
        errors.push(`fields[${index}].required must be a boolean`);
    }
    if (options !== undefined && (!Array.isArray(options) || options.some((o) => typeof o !== "string"))) {
        errors.push(`fields[${index}].options must be an array of strings`);
    }

    if (isCustom === true) {
        if (typeof key !== "string" || !CUSTOM_FIELD_KEY_REGEX.test(key)) {
            errors.push(`fields[${index}].key must match "customFields.<name>" for custom fields`);
        }
        if (!CUSTOM_FIELD_TYPES.includes(type as FormFieldConfig["type"])) {
            errors.push(`fields[${index}].type must be one of: ${CUSTOM_FIELD_TYPES.join(", ")} for custom fields`);
        }
    } else if (isCustom === false) {
        if (typeof id === "string" && !DEFAULT_FORM_FIELD_IDS.has(id)) {
            errors.push(`fields[${index}].id "${id}" is not a recognized built-in field`);
        }
    }

    if (errors.length > 0) {
        return undefined;
    }
    return value as unknown as FormFieldConfig;
}

export function validateFormSettingsUpdate(body: unknown): { errors: string[]; fields?: FormFieldConfig[] } {
    if (!isRecord(body) || !Array.isArray(body.fields)) {
        return { errors: ["Request body must be a JSON object with a `fields` array"] };
    }

    const { fields } = body;
    if (fields.length === 0) {
        return { errors: ["fields must contain at least one field"] };
    }
    if (fields.length > MAX_FIELDS) {
        return { errors: [`fields must contain at most ${MAX_FIELDS} entries`] };
    }

    const errors: string[] = [];
    const validated: FormFieldConfig[] = [];
    fields.forEach((field, index) => {
        const result = validateField(field, index, errors);
        if (result) {
            validated.push(result);
        }
    });

    if (errors.length > 0) {
        return { errors };
    }

    const ids = validated.map((field) => field.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        errors.push(`fields contain duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);
    }

    const missingDefaults = [...DEFAULT_FORM_FIELD_IDS].filter((id) => !ids.includes(id));
    if (missingDefaults.length > 0) {
        errors.push(`fields is missing required built-in fields: ${missingDefaults.join(", ")}`);
    }

    if (errors.length > 0) {
        return { errors };
    }
    return { errors, fields: validated };
}
