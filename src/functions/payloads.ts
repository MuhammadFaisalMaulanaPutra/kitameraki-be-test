export interface FieldSetting {
    id: string;
    key: string;
    label: string;
    type: string;
    defaultField: boolean;
    removable: boolean;
    editableType: boolean;
    row: number;
    column: number;
}

export interface TaskPayload {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    organizationId: string;
    tags: string[];
    customFields: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isFieldSetting(value: unknown): value is FieldSetting {
    if (!isObject(value)) {
        return false;
    }

    return isString(value.id)
        && isString(value.key)
        && isString(value.label)
        && isString(value.type)
        && isBoolean(value.defaultField)
        && isBoolean(value.removable)
        && isBoolean(value.editableType)
        && isNumber(value.row)
        && isNumber(value.column);
}

export function isFieldSettingsArray(value: unknown): value is FieldSetting[] {
    return Array.isArray(value) && value.every((item) => isFieldSetting(item));
}

export function normalizeTaskPayload(
    value: Record<string, unknown>,
    queryOrganizationId: string | null
): TaskPayload | null {
    const organizationIdValue = value.organizationId;
    const organizationId = isString(organizationIdValue) && organizationIdValue.trim()
        ? organizationIdValue.trim()
        : queryOrganizationId?.trim() || "";

    if (!organizationId) {
        return null;
    }

    return {
        title: isString(value.title) ? value.title : "",
        description: isString(value.description) ? value.description : "",
        status: isString(value.status) ? value.status : "todo",
        priority: isString(value.priority) ? value.priority : "medium",
        dueDate: isString(value.dueDate) ? value.dueDate : "",
        organizationId,
        tags: Array.isArray(value.tags) ? value.tags.filter((tag) => typeof tag === "string") : [],
        customFields: isObject(value.customFields) ? value.customFields : {}
    };
}