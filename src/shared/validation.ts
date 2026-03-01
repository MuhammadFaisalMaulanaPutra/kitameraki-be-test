import { HttpRequest } from "@azure/functions";
import { HttpError } from "./http";

export function requireQuery(request: HttpRequest, name: string): string {
    const value = request.query.get(name)?.trim();
    if (!value) {
        throw new HttpError(400, `Missing required query parameter: ${name}`);
    }
    return value;
}

export function requireBodyObject(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object");
    }
    return body as Record<string, unknown>;
}

export function requireStringField(body: Record<string, unknown>, field: string): string {
    const val = body[field];
    if (typeof val !== "string" || !val.trim()) {
        throw new HttpError(400, `Missing or invalid required field: ${field}`);
    }
    return val.trim();
}

export function forbidImmutableFields(body: Record<string, unknown>, forbiddenKeys: string[]): void {
    const blocked = Object.keys(body).filter(k => forbiddenKeys.includes(k));
    if (blocked.length > 0) {
        throw new HttpError(400, `Cannot update immutable field(s): ${blocked.join(", ")}`);
    }
}

export interface PaginationInfo {
    page: number;
    pageSize: number;
}

export function normalizePagination(request: HttpRequest): PaginationInfo {
    let page = parseInt(request.query.get("page") || "1", 10);
    let pageSize = parseInt(request.query.get("pageSize") || "10", 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50;

    return { page, pageSize };
}

export const VALID_STATUSES = new Set(["Todo", "InProgress", "Done"]);
export const MAX_TITLE_LENGTH = 500;
export const MAX_ORG_ID_LENGTH = 200;
export const MAX_FIELDS_COUNT = 100;

export interface TaskCreateInput {
    organizationId: string;
    title: string;
    status: string; // Made required, defaults to Todo
    customFields: Record<string, unknown>;
    [key: string]: unknown;
}

export function validateTaskCreate(body: Record<string, unknown>): TaskCreateInput {
    const organizationId = requireStringField(body, "organizationId");
    if (organizationId.length > MAX_ORG_ID_LENGTH) {
        throw new HttpError(400, `organizationId must be at most ${MAX_ORG_ID_LENGTH} characters`);
    }

    const title = requireStringField(body, "title");
    if (title.length > MAX_TITLE_LENGTH) {
        throw new HttpError(400, `title must be at most ${MAX_TITLE_LENGTH} characters`);
    }

    const status = body.status !== undefined ? String(body.status) : "Todo";
    if (!VALID_STATUSES.has(status)) {
        throw new HttpError(400, `status must be one of: ${[...VALID_STATUSES].join(", ")}`);
    }

    const customFields = body.customFields;
    if (customFields !== undefined) {
        if (typeof customFields !== "object" || customFields === null || Array.isArray(customFields)) {
            throw new HttpError(400, "customFields must be a JSON object");
        }
        if (Object.keys(customFields).length > MAX_FIELDS_COUNT) {
            throw new HttpError(400, `customFields must have at most ${MAX_FIELDS_COUNT} keys`);
        }
    }

    return {
        organizationId,
        title,
        status,
        customFields: (customFields as Record<string, unknown>) ?? {}
    };
}

export interface FormField {
    key: string;
    label: string;
    type: string;
    order: number;
    required?: boolean;
    col?: number;
}

export interface FormSettingsInput {
    organizationId: string;
    id: "task-form";
    fields: FormField[];
}

export function validateFormSettings(body: Record<string, unknown>): FormSettingsInput {
    const organizationId = requireStringField(body, "organizationId");

    if (organizationId.length > MAX_ORG_ID_LENGTH) {
        throw new HttpError(400, `organizationId must be at most ${MAX_ORG_ID_LENGTH} characters`);
    }

    const fields = body.fields;
    if (!Array.isArray(fields)) {
        throw new HttpError(400, "fields must be an array");
    }

    if (fields.length > MAX_FIELDS_COUNT) {
        throw new HttpError(400, `fields must contain at most ${MAX_FIELDS_COUNT} entries`);
    }

    for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (!f || typeof f !== "object" || Array.isArray(f)) {
            throw new HttpError(400, `fields[${i}] must be an object`);
        }
        const field = f as Record<string, unknown>;
        if (!field.key || typeof field.key !== "string") {
            throw new HttpError(400, `fields[${i}].key must be a non-empty string`);
        }
        if (!field.label || typeof field.label !== "string") {
            throw new HttpError(400, `fields[${i}].label must be a non-empty string`);
        }
        if (!field.type || typeof field.type !== "string") {
            throw new HttpError(400, `fields[${i}].type must be a non-empty string`);
        }
        if (typeof field.order !== "number") {
            throw new HttpError(400, `fields[${i}].order must be a number`);
        }
    }

    return {
        organizationId,
        id: "task-form",
        fields: fields as FormField[]
    };
}
