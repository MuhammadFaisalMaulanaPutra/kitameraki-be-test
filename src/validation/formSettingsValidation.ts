import {
  FORM_FIELD_TYPES,
  FormField,
  FormFieldType,
  SYSTEM_FORM_FIELDS,
  SYSTEM_FIELD_IDS,
} from '../domain/formSettings';
import { ValidationError, ValidationIssue } from '../errors/AppError';
import { isRecord, rejectUnknownKeys, requireRecord, validateNonEmptyString } from './common';

const FORM_FIELD_KEYS = [
  'id',
  'key',
  'label',
  'type',
  'isSystem',
  'required',
  'showInTable',
  'row',
  'column',
  'order',
] as const;

export function parseFormSettingsBody(body: unknown): FormField[] {
  const value = requireRecord(body);
  rejectUnknownKeys(value, ['fields']);

  if (!Array.isArray(value.fields)) {
    throw new ValidationError([{ field: 'fields', message: 'fields must be an array.' }]);
  }
  if (value.fields.length < SYSTEM_FORM_FIELDS.length) {
    throw new ValidationError([{ field: 'fields', message: 'Required system fields cannot be removed.' }]);
  }
  const fields = value.fields.map((field, index) => parseFormField(field, index));
  validateFormFields(fields);
  return fields;
}

function parseFormField(raw: unknown, index: number): FormField {
  if (!isRecord(raw)) {
    throw new ValidationError([{ field: `fields[${index}]`, message: 'Field configuration must be an object.' }]);
  }
  rejectUnknownKeys(raw, FORM_FIELD_KEYS, `fields[${index}]`);

  const id = validateFieldId(raw.id, `fields[${index}].id`);
  const isSystem = SYSTEM_FIELD_IDS.has(id);
  const systemDefinition = SYSTEM_FORM_FIELDS.find((field) => field.id === id);
  const key = validateFieldId(raw.key, `fields[${index}].key`);
  const label = validateNonEmptyString(raw.label, `fields[${index}].label`, 100);
  const type = validateFieldType(raw.type, `fields[${index}].type`);
  const required = validateBoolean(raw.required, `fields[${index}].required`);
  const showInTable = validateBoolean(raw.showInTable, `fields[${index}].showInTable`);
  const row = validatePositiveInteger(raw.row, `fields[${index}].row`);
  const column = validateColumn(raw.column, `fields[${index}].column`);
  const order = validatePositiveInteger(raw.order, `fields[${index}].order`);

  if (systemDefinition) {
    const issues: ValidationIssue[] = [];
    if (key !== systemDefinition.key) {
      issues.push({ field: `fields[${index}].key`, message: 'System field keys are immutable.' });
    }
    if (type !== systemDefinition.type) {
      issues.push({ field: `fields[${index}].type`, message: 'System field types are immutable.' });
    }
    if ((id === 'title' || id === 'status') && !required) {
      issues.push({ field: `fields[${index}].required`, message: `${id} must remain required.` });
    }
    if (issues.length) {
      throw new ValidationError(issues);
    }
  } else if (key !== id) {
    throw new ValidationError([
      { field: `fields[${index}].key`, message: 'Custom field key must match its stable field id.' },
    ]);
  }

  return { id, key, label, type, isSystem, required, showInTable, row, column, order };
}

export function validateFormFields(fields: FormField[]): void {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const positions = new Set<string>();
  const orders = new Set<number>();

  for (const systemDefinition of SYSTEM_FORM_FIELDS) {
    const field = fields.find((candidate) => candidate.id === systemDefinition.id);
    if (!field) {
      issues.push({ field: 'fields', message: `Required system field "${systemDefinition.id}" is missing.` });
      continue;
    }
    if (!field.isSystem) {
      issues.push({ field: `fields.${field.id}.isSystem`, message: 'System field identity is immutable.' });
    }
    if (field.key !== systemDefinition.key) {
      issues.push({ field: `fields.${field.id}.key`, message: 'System field keys are immutable.' });
    }
    if (field.type !== systemDefinition.type) {
      issues.push({ field: `fields.${field.id}.type`, message: 'System field types are immutable.' });
    }
    if ((field.id === 'title' || field.id === 'status') && !field.required) {
      issues.push({ field: `fields.${field.id}.required`, message: `${field.id} must remain required.` });
    }
  }

  fields.forEach((field, index) => {
    if (!SYSTEM_FIELD_IDS.has(field.id)) {
      if (field.isSystem) {
        issues.push({ field: `fields[${index}].isSystem`, message: 'Custom fields cannot be marked as system fields.' });
      }
      if (field.key !== field.id) {
        issues.push({ field: `fields[${index}].key`, message: 'Custom field key must match its stable field id.' });
      }
    }
    if (!field.label.trim() || field.label.length > 100) {
      issues.push({ field: `fields[${index}].label`, message: 'Field label must be 1-100 characters.' });
    }
    if (!FORM_FIELD_TYPES.includes(field.type)) {
      issues.push({ field: `fields[${index}].type`, message: 'Unsupported field type.' });
    }
    if (typeof field.required !== 'boolean' || typeof field.showInTable !== 'boolean') {
      issues.push({ field: `fields[${index}]`, message: 'required and showInTable must be boolean values.' });
    }
    if (!Number.isSafeInteger(field.row) || field.row < 1) {
      issues.push({ field: `fields[${index}].row`, message: 'row must be a positive integer.' });
    }
    if (field.column !== 1 && field.column !== 2) {
      issues.push({ field: `fields[${index}].column`, message: 'column must be either 1 or 2.' });
    }
    if (!Number.isSafeInteger(field.order) || field.order < 1) {
      issues.push({ field: `fields[${index}].order`, message: 'order must be a positive integer.' });
    }
    if (ids.has(field.id)) {
      issues.push({ field: `fields[${index}].id`, message: 'Field ids must be unique.' });
    }
    ids.add(field.id);

    const position = `${field.row}:${field.column}`;
    if (positions.has(position)) {
      issues.push({ field: `fields[${index}].column`, message: 'Only one field may occupy each row/column position.' });
    }
    positions.add(position);

    if (orders.has(field.order)) {
      issues.push({ field: `fields[${index}].order`, message: 'Field order values must be unique.' });
    }
    orders.add(field.order);
  });

  if (issues.length) {
    throw new ValidationError(issues);
  }
}

function validateFieldId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError([{ field, message: 'Field id must be a string.' }]);
  }
  const normalized = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(normalized)) {
    throw new ValidationError([
      { field, message: 'Field id must start with a letter and contain only letters, numbers, underscore, or hyphen.' },
    ]);
  }
  return normalized;
}

function validateFieldType(value: unknown, field: string): FormFieldType {
  if (typeof value !== 'string' || !FORM_FIELD_TYPES.includes(value as FormFieldType)) {
    throw new ValidationError([{ field, message: `Field type must be one of: ${FORM_FIELD_TYPES.join(', ')}.` }]);
  }
  return value as FormFieldType;
}

function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError([{ field, message: `${field} must be a boolean.` }]);
  }
  return value;
}

function validatePositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new ValidationError([{ field, message: `${field} must be a positive integer.` }]);
  }
  return value as number;
}

function validateColumn(value: unknown, field: string): 1 | 2 {
  if (value !== 1 && value !== 2) {
    throw new ValidationError([{ field, message: `${field} must be either 1 or 2.` }]);
  }
  return value;
}
