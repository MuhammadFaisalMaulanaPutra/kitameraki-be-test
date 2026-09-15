import { IMMUTABLE_TASK_FIELDS, Task, TASK_FIELDS, TaskPriority, TaskStatus } from "../models/task";

const PRIORITIES: readonly TaskPriority[] = ["low", "medium", "high"];
const STATUSES: readonly TaskStatus[] = ["todo", "in-progress", "completed"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FIELDS = new Set<string>(TASK_FIELDS);
const IMMUTABLE_FIELDS = new Set<string>(IMMUTABLE_TASK_FIELDS);

export function isValidUuid(value: string | null | undefined): value is string {
    return typeof value === "string" && UUID_REGEX.test(value);
}

// Validates the fields that are optional on insert but, when present on a
// patch, must still match the schema's type/format constraints.
function validateOptionalFields(body: Record<string, unknown>, errors: string[]): void {
    if ("title" in body) {
        if (typeof body.title !== "string" || body.title.length === 0 || body.title.length > 100) {
            errors.push("title must be a non-empty string of at most 100 characters");
        }
    }
    if ("description" in body) {
        if (typeof body.description !== "string" || body.description.length > 1000) {
            errors.push("description must be a string of at most 1000 characters");
        }
    }
    if ("dueDate" in body) {
        if (typeof body.dueDate !== "string" || Number.isNaN(Date.parse(body.dueDate))) {
            errors.push("dueDate must be a valid ISO 8601 date-time string");
        }
    }
    if ("priority" in body) {
        if (!PRIORITIES.includes(body.priority as TaskPriority)) {
            errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
        }
    }
    if ("status" in body) {
        if (!STATUSES.includes(body.status as TaskStatus)) {
            errors.push(`status must be one of: ${STATUSES.join(", ")}`);
        }
    }
    if ("tags" in body) {
        const tags = body.tags;
        if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string" || tag.length > 50)) {
            errors.push("tags must be an array of strings of at most 50 characters each");
        }
    }
    if ("customFields" in body) {
        const customFields = body.customFields;
        const isValidCustomFields =
            typeof customFields === "object" &&
            customFields !== null &&
            !Array.isArray(customFields) &&
            Object.entries(customFields as Record<string, unknown>).every(
                ([key, value]) => key.length > 0 && key.length <= 100 &&
                    (value === null || (typeof value === "string" && value.length <= 1000))
            );
        if (!isValidCustomFields) {
            errors.push("customFields must be an object mapping field keys to string or null values");
        }
    }
}

function asRecord(body: unknown): Record<string, unknown> | undefined {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return undefined;
    }
    return body as Record<string, unknown>;
}

export function validateNewTask(body: unknown): { errors: string[]; task?: Task } {
    const record = asRecord(body);
    if (!record) {
        return { errors: ["Request body must be a JSON object"] };
    }

    const errors: string[] = [];

    for (const key of Object.keys(record)) {
        if (!ALLOWED_FIELDS.has(key)) {
            errors.push(`Unknown field: ${key}`);
        }
    }

    if (!isValidUuid(record.id as string)) {
        errors.push("id is required and must be a valid UUID");
    }
    if (!isValidUuid(record.organizationId as string)) {
        errors.push("organizationId is required and must be a valid UUID");
    }
    if (typeof record.title !== "string" || record.title.length === 0 || record.title.length > 100) {
        errors.push("title is required and must be a non-empty string of at most 100 characters");
    }
    if (!STATUSES.includes(record.status as TaskStatus)) {
        errors.push(`status is required and must be one of: ${STATUSES.join(", ")}`);
    }

    validateOptionalFields(record, errors);

    if (errors.length > 0) {
        return { errors };
    }
    return { errors, task: record as unknown as Task };
}

export function validateTaskPatch(body: unknown): { errors: string[]; patch?: Partial<Task> } {
    const record = asRecord(body);
    if (!record) {
        return { errors: ["Request body must be a JSON object"] };
    }

    if (Object.keys(record).length === 0) {
        return { errors: ["Request body must contain at least one field to update"] };
    }

    const errors: string[] = [];

    for (const key of Object.keys(record)) {
        if (IMMUTABLE_FIELDS.has(key)) {
            errors.push(`Field is immutable and cannot be updated: ${key}`);
        } else if (!ALLOWED_FIELDS.has(key)) {
            errors.push(`Unknown field: ${key}`);
        }
    }

    validateOptionalFields(record, errors);

    if (errors.length > 0) {
        return { errors };
    }
    return { errors, patch: record as Partial<Task> };
}
