import { FormSettings } from '../domain/formSettings';
import {
  CreateTaskInput,
  CustomFieldValues,
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
  TaskListQuery,
  TaskPriority,
  TaskSortField,
  TaskStatus,
  UpdateTaskInput,
} from '../domain/task';
import { ValidationError, ValidationIssue } from '../errors/AppError';
import {
  isRecord,
  rejectUnknownKeys,
  requireRecord,
  validateDate,
  validateIdentifier,
  validateIsoDateTime,
  validateNonEmptyString,
  validateOptionalString,
} from './common';

const CREATE_TASK_KEYS = [
  'organizationId',
  'title',
  'description',
  'dueDate',
  'priority',
  'status',
  'tags',
  'customFields',
] as const;

const UPDATE_TASK_KEYS = ['title', 'description', 'dueDate', 'priority', 'status', 'tags', 'customFields'] as const;

export interface ParsedCreateTaskBody {
  organizationId?: string;
  input: CreateTaskInput;
}

export function parseCreateTaskBody(body: unknown): ParsedCreateTaskBody {
  const value = requireRecord(body);
  rejectUnknownKeys(value, CREATE_TASK_KEYS);

  const organizationId = value.organizationId === undefined ? undefined : validateIdentifier(value.organizationId, 'organizationId');
  const title = validateNonEmptyString(value.title, 'title', 100);
  const description = validateOptionalString(value.description, 'description', 1000);
  const dueDate = validateIsoDateTime(value.dueDate, 'dueDate');
  const priority = validatePriority(value.priority, false) ?? undefined;
  const status = validateStatus(value.status, true)!;
  const tags = validateTags(value.tags, false);
  const customFields = validateCustomFieldsObject(value.customFields);

  const input: CreateTaskInput = { title, status };
  if (description !== undefined && description !== null) input.description = description;
  if (dueDate !== undefined && dueDate !== null) input.dueDate = dueDate;
  if (priority !== undefined) input.priority = priority;
  if (tags !== undefined && tags !== null) input.tags = tags;
  if (customFields !== undefined) input.customFields = customFields;

  return { organizationId, input };
}

export function parseUpdateTaskBody(body: unknown): UpdateTaskInput {
  const value = requireRecord(body);
  rejectUnknownKeys(value, UPDATE_TASK_KEYS);

  if (Object.keys(value).length === 0) {
    throw new ValidationError([{ field: 'body', message: 'At least one updatable field is required.' }]);
  }

  const result: UpdateTaskInput = {};

  if ('title' in value) {
    result.title = validateNonEmptyString(value.title, 'title', 100);
  }
  if ('description' in value) {
    result.description = validateOptionalString(value.description, 'description', 1000, true) ?? null;
  }
  if ('dueDate' in value) {
    result.dueDate = validateIsoDateTime(value.dueDate, 'dueDate', true) ?? null;
  }
  if ('priority' in value) {
    result.priority = validatePriority(value.priority, false, true) ?? null;
  }
  if ('status' in value) {
    result.status = validateStatus(value.status, true)!;
  }
  if ('tags' in value) {
    result.tags = validateTags(value.tags, false, true) ?? null;
  }
  if ('customFields' in value) {
    result.customFields = validateCustomFieldsObject(value.customFields) ?? {};
  }

  return result;
}

export function parseTaskListQuery(params: URLSearchParams, organizationId: string): TaskListQuery {
  const search = normalizeSearch(params.get('search'));
  const status = validateStatus(params.get('status') ?? undefined, false);
  const priority = validatePriority(params.get('priority') ?? undefined, false) ?? undefined;
  const tags = parseTagsQuery(params.get('tags'));
  const pageSize = parsePageSize(params.get('pageSize'));
  const pageToken = params.get('pageToken')?.trim() || undefined;
  const sortBy = parseSortBy(params.get('sortBy'));
  const sortDirection = parseSortDirection(params.get('sortDirection'));

  return {
    organizationId,
    search,
    status,
    priority,
    tags,
    pageSize,
    pageToken,
    sortBy,
    sortDirection,
  };
}

export function parseBulkDeleteBody(body: unknown): string[] {
  let rawIds: unknown;
  if (Array.isArray(body)) {
    rawIds = body;
  } else {
    const value = requireRecord(body);
    rejectUnknownKeys(value, ['ids']);
    rawIds = value.ids;
  }

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new ValidationError([{ field: 'ids', message: 'ids must be a non-empty array.' }]);
  }
  if (rawIds.length > 100) {
    throw new ValidationError([{ field: 'ids', message: 'A maximum of 100 task ids can be deleted at once.' }]);
  }

  const ids = rawIds.map((id, index) => validateIdentifier(id, `ids[${index}]`));
  return [...new Set(ids)];
}

export function validateTaskCustomFields(
  values: CustomFieldValues | undefined,
  settings: FormSettings,
  requireConfiguredRequiredFields: boolean,
): CustomFieldValues | undefined {
  const customFields = settings.fields.filter((field) => !field.isSystem);
  const byId = new Map(customFields.map((field) => [field.id, field]));
  const issues: ValidationIssue[] = [];
  const sanitized: CustomFieldValues = {};
  const source = values ?? {};

  for (const key of Object.keys(source)) {
    const field = byId.get(key);
    if (!field) {
      issues.push({ field: `customFields.${key}`, message: 'Field is not part of the active form configuration.' });
      continue;
    }

    const raw = source[key];
    if (isEmptyValue(raw)) {
      if (field.required) {
        issues.push({ field: `customFields.${key}`, message: `${field.label} is required.` });
      } else {
        sanitized[key] = raw;
      }
      continue;
    }

    try {
      sanitized[key] = validateCustomFieldValue(raw, field.type, `customFields.${key}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        issues.push(...error.issues);
      } else {
        throw error;
      }
    }
  }

  if (requireConfiguredRequiredFields) {
    for (const field of customFields) {
      if (field.required && !(field.id in source)) {
        issues.push({ field: `customFields.${field.id}`, message: `${field.label} is required.` });
      }
    }
  }

  if (issues.length) {
    throw new ValidationError(issues);
  }

  return Object.keys(sanitized).length ? sanitized : values === undefined ? undefined : {};
}

export function validateConfiguredSystemFieldsOnCreate(input: CreateTaskInput, settings: FormSettings): void {
  const issues: ValidationIssue[] = [];
  for (const field of settings.fields.filter((candidate) => candidate.isSystem && candidate.required)) {
    const value = input[field.key as keyof CreateTaskInput];
    if (isEmptyValue(value)) {
      issues.push({ field: field.key, message: `${field.label} is required.` });
    }
  }
  if (issues.length) {
    throw new ValidationError(issues);
  }
}

export function validateConfiguredSystemFieldsOnUpdate(input: UpdateTaskInput, settings: FormSettings): void {
  const issues: ValidationIssue[] = [];
  const requiredKeys = new Map(
    settings.fields.filter((field) => field.isSystem && field.required).map((field) => [field.key, field.label]),
  );

  for (const [key, value] of Object.entries(input)) {
    const label = requiredKeys.get(key);
    if (label && isEmptyValue(value)) {
      issues.push({ field: key, message: `${label} is required.` });
    }
  }

  if (issues.length) {
    throw new ValidationError(issues);
  }
}

function validateStatus(value: unknown, required: boolean): TaskStatus | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError([{ field: 'status', message: 'status is required.' }]);
    }
    return undefined;
  }
  if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new ValidationError([{ field: 'status', message: `status must be one of: ${TASK_STATUSES.join(', ')}.` }]);
  }
  return value as TaskStatus;
}

function validatePriority(value: unknown, required: boolean, allowNull = false): TaskPriority | null | undefined {
  if (value === null && allowNull) {
    return null;
  }
  if (value === undefined || value === '') {
    if (required) {
      throw new ValidationError([{ field: 'priority', message: 'priority is required.' }]);
    }
    return undefined;
  }
  if (typeof value !== 'string' || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new ValidationError([
      { field: 'priority', message: `priority must be one of: ${TASK_PRIORITIES.join(', ')}.` },
    ]);
  }
  return value as TaskPriority;
}

function validateTags(value: unknown, required: boolean, allowNull = false): string[] | null | undefined {
  if (value === null && allowNull) {
    return null;
  }
  if (value === undefined) {
    if (required) {
      throw new ValidationError([{ field: 'tags', message: 'tags is required.' }]);
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ValidationError([{ field: 'tags', message: 'tags must be an array of strings.' }]);
  }
  if (value.length > 20) {
    throw new ValidationError([{ field: 'tags', message: 'A maximum of 20 tags is allowed.' }]);
  }

  const tags = value.map((tag, index) => validateNonEmptyString(tag, `tags[${index}]`, 50));
  return [...new Set(tags)];
}

function validateCustomFieldsObject(value: unknown): CustomFieldValues | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new ValidationError([{ field: 'customFields', message: 'customFields must be a JSON object.' }]);
  }
  return value;
}

function validateCustomFieldValue(value: unknown, type: string, field: string): unknown {
  switch (type) {
    case 'text':
      return validateOptionalString(value, field, 2000) ?? '';
    case 'date':
      return validateDate(value, field);
    case 'datetime':
      return validateIsoDateTime(value, field)!;
    case 'email': {
      if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new ValidationError([{ field, message: `${field} must be a valid email address.` }]);
      }
      return value.trim();
    }
    default:
      throw new ValidationError([{ field, message: `${field} uses an unsupported field type.` }]);
  }
}

function normalizeSearch(value: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > 100) {
    throw new ValidationError([{ field: 'search', message: 'search must be at most 100 characters.' }]);
  }
  return normalized;
}

function parseTagsQuery(value: string | null): string[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const tags = value.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 10) {
    throw new ValidationError([{ field: 'tags', message: 'A maximum of 10 tag filters is allowed.' }]);
  }
  return tags.map((tag, index) => validateNonEmptyString(tag, `tags[${index}]`, 50));
}

function parsePageSize(value: string | null): number {
  if (value === null || value === '') {
    return 20;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ValidationError([{ field: 'pageSize', message: 'pageSize must be an integer between 1 and 100.' }]);
  }
  return parsed;
}

function parseSortBy(value: string | null): TaskSortField | undefined {
  if (!value) {
    return undefined;
  }
  if (!TASK_SORT_FIELDS.includes(value as TaskSortField)) {
    throw new ValidationError([{ field: 'sortBy', message: `sortBy must be one of: ${TASK_SORT_FIELDS.join(', ')}.` }]);
  }
  return value as TaskSortField;
}

function parseSortDirection(value: string | null): 'asc' | 'desc' {
  if (!value) {
    return 'desc';
  }
  if (value !== 'asc' && value !== 'desc') {
    throw new ValidationError([{ field: 'sortDirection', message: 'sortDirection must be asc or desc.' }]);
  }
  return value;
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}
