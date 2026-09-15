import { z } from 'zod';
import { AppError } from '../errors';
import { SYSTEM_FIELD_IDS, SYSTEM_FIELD_REQUIRED, SYSTEM_FIELD_TYPES } from './defaultSettings';
import { filtersSchema, formSettingsInputSchema, taskInputSchema, taskPatchSchema } from './models';
import type {
  FieldDefinition,
  FieldFilter,
  FormSettingsInput,
  ListTasksQuery,
  TaskInput,
  TaskPatch,
} from './models';

export const parseTaskInput = (value: unknown): TaskInput => parse(taskInputSchema, value);

export const parseTaskPatch = (value: unknown): TaskPatch => parse(taskPatchSchema, value);

export const parseListQuery = (query: URLSearchParams): ListTasksQuery => {
  const page = parsePositiveInteger(query.get('page'), 1);
  const pageSize = parsePositiveInteger(query.get('pageSize'), 10);
  if (page > 10_000) {
    throw new AppError(400, 'validation_error', 'page cannot exceed 10,000.');
  }
  if (pageSize > 50) {
    throw new AppError(400, 'validation_error', 'pageSize cannot exceed 50.');
  }

  const q = query.get('q')?.trim() || undefined;
  if (q && q.length > 100) {
    throw new AppError(400, 'validation_error', 'q cannot exceed 100 characters.');
  }

  let rawFilters: unknown = [];
  const filters = query.get('filters');
  if (filters) {
    try {
      rawFilters = JSON.parse(filters);
    } catch {
      throw new AppError(400, 'validation_error', 'filters must be valid JSON.');
    }
  }

  return {
    page,
    pageSize,
    q,
    filters: parse(filtersSchema, rawFilters),
  };
};

export const parseFormSettings = (value: unknown): FormSettingsInput => {
  const settings = parse(formSettingsInputSchema, value);
  const fieldIds = settings.fields.map((field) => field.id);
  if (settings.fields.length < SYSTEM_FIELD_IDS.length) {
    throw new AppError(400, 'validation_error', 'All built-in fields are required.');
  }
  if (new Set(fieldIds).size !== fieldIds.length) {
    throw new AppError(400, 'validation_error', 'Field IDs must be unique.');
  }

  const rowIds = settings.rows.map((row) => row.id);
  if (new Set(rowIds).size !== rowIds.length) {
    throw new AppError(400, 'validation_error', 'Row IDs must be unique.');
  }

  const placedIds = settings.rows.flatMap((row) => row.fieldIds);
  if (
    placedIds.length !== fieldIds.length ||
    new Set(placedIds).size !== placedIds.length ||
    placedIds.some((id) => !fieldIds.includes(id))
  ) {
    throw new AppError(
      400,
      'validation_error',
      'Every field must appear in the layout exactly once.',
    );
  }

  validateSystemFields(settings.fields);
  for (const field of settings.fields.filter((candidate) => candidate.kind === 'custom')) {
    if (!/^custom-[0-9a-f-]{36}$/i.test(field.id)) {
      throw new AppError(400, 'validation_error', `Invalid custom field ID: ${field.id}.`);
    }
    if (!['text', 'date', 'datetime', 'email'].includes(field.type) || field.required) {
      throw new AppError(400, 'validation_error', `Invalid custom field definition: ${field.id}.`);
    }
  }

  return settings;
};

export const validateFilters = (filters: FieldFilter[], fields: FieldDefinition[]): void => {
  for (const filter of filters) {
    const field = fields.find((candidate) => candidate.id === filter.fieldId);
    if (!field) {
      throw new AppError(400, 'validation_error', `Unknown filter field: ${filter.fieldId}.`);
    }

    const dateField = field.type === 'date' || field.type === 'datetime';
    if (dateField !== (filter.operator === 'between')) {
      throw new AppError(400, 'validation_error', `Invalid filter operator for ${field.label}.`);
    }

    const enumField = field.id === 'status' || field.id === 'priority';
    if (enumField && filter.operator !== 'equals') {
      throw new AppError(400, 'validation_error', `${field.label} requires an equals filter.`);
    }
    if (!dateField && !enumField && filter.operator !== 'contains') {
      throw new AppError(400, 'validation_error', `${field.label} requires a contains filter.`);
    }

    if (filter.operator === 'between') {
      const valueSchema = field.type === 'date' ? z.iso.date() : z.iso.datetime();
      if (
        (filter.from && !valueSchema.safeParse(filter.from).success) ||
        (filter.to && !valueSchema.safeParse(filter.to).success)
      ) {
        throw new AppError(
          400,
          'validation_error',
          `${field.label} contains an invalid date range.`,
        );
      }
    }

    if (
      field.id === 'status' &&
      filter.operator === 'equals' &&
      !['todo', 'in-progress', 'completed'].includes(filter.value)
    ) {
      throw new AppError(400, 'validation_error', 'Invalid status filter.');
    }
    if (
      field.id === 'priority' &&
      filter.operator === 'equals' &&
      !['low', 'medium', 'high'].includes(filter.value)
    ) {
      throw new AppError(400, 'validation_error', 'Invalid priority filter.');
    }
  }
};

const validateSystemFields = (fields: FieldDefinition[]): void => {
  for (const id of SYSTEM_FIELD_IDS) {
    const field = fields.find((candidate) => candidate.id === id);
    if (
      !field ||
      field.kind !== 'system' ||
      field.type !== SYSTEM_FIELD_TYPES[id] ||
      field.required !== SYSTEM_FIELD_REQUIRED[id]
    ) {
      throw new AppError(
        400,
        'validation_error',
        `Built-in field ${id} cannot be removed or structurally changed.`,
      );
    }
  }

  if (
    fields.some(
      (field) =>
        field.kind === 'system' &&
        !SYSTEM_FIELD_IDS.includes(field.id as (typeof SYSTEM_FIELD_IDS)[number]),
    )
  ) {
    throw new AppError(400, 'validation_error', 'Unknown built-in field.');
  }
};

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError(400, 'validation_error', 'Pagination values must be positive integers.');
  }
  return parsed;
};

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, 'validation_error', 'The request is invalid.', result.error.flatten());
  }
  return result.data;
};
