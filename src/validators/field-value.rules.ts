import { z } from 'zod';
import type { FormField, JsonValue } from '../models/form-settings.model';

const emailSchema = z.email();
const isoDateSchema = z.iso.date();
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const PHONE_PATTERN = /^\+?[0-9\s().-]{6,20}$/;
/** Time component value: 24-hour "HH:mm" (the 12-hour display is a presentation option only). */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Hard limits that apply whatever the form settings say. */
export const MAX_TEXT_LENGTH = 1000;
export const MAX_LIST_ITEMS = 20;
export const MAX_TAG_LENGTH = 50;
/** File picker: files per value when "multiple" is enabled (otherwise 1). */
export const MAX_FILES = 10;
/** Dynamic list: items per list. */
export const MAX_DYNAMIC_LIST_ITEMS = 50;

/** One day of tolerance so users in timezones ahead of UTC are not rejected around midnight. */
const PAST_DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/** A File picker value item: a file uploaded with `POST /files` (see FileReference). */
export const fileReferenceSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  size: z.number().int().min(0),
  contentType: z.string().max(255),
});

export function compileCustomPattern(pattern: string): RegExp {
  return new RegExp(`^(?:${pattern})$`);
}

export function isEmptyValue(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** Options source "Input data" or "Expression": the options are only known in the browser. */
export function hasDynamicOptions(field: FormField): boolean {
  return Boolean(field.valuesKey || field.valuesExpression);
}

function isStringList(value: JsonValue): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function optionValues(field: FormField): string[] {
  return (field.options ?? []).map((option) => option.value);
}

function checkText(field: FormField, value: string): string | null {
  const { minLength, maxLength, pattern, customPattern } = field.validation ?? {};
  if (value.length > Math.min(maxLength ?? MAX_TEXT_LENGTH, MAX_TEXT_LENGTH)) {
    return `Must be at most ${Math.min(maxLength ?? MAX_TEXT_LENGTH, MAX_TEXT_LENGTH)} characters`;
  }
  if (minLength !== undefined && value.length < minLength) return `Must be at least ${minLength} characters`;
  if (field.type !== 'text') return null;
  if (pattern === 'email' && !emailSchema.safeParse(value).success) return 'Must be a valid email address';
  if (pattern === 'phone' && !PHONE_PATTERN.test(value)) return 'Must be a valid phone number';
  if (pattern === 'custom' && customPattern) {
    try {
      if (!compileCustomPattern(customPattern).test(value)) return 'Does not match the required format';
    } catch {
      return 'Does not match the required format';
    }
  }
  return null;
}

function checkPast(timestamp: number, now: Date): string | null {
  return timestamp < now.getTime() - PAST_DATE_TOLERANCE_MS ? 'Must not be in the past' : null;
}

function checkList(field: FormField, value: JsonValue): string | null {
  if (!isStringList(value)) return 'Must be a list of values';
  if (value.length > MAX_LIST_ITEMS) return `Must contain at most ${MAX_LIST_ITEMS} values`;
  // Options from input data / an expression are resolved in the browser: only the shape can be checked here.
  if (hasDynamicOptions(field)) return null;
  const allowed = optionValues(field);
  // A Tag list without static options accepts free-form tags.
  if (allowed.length === 0 && field.type === 'taglist') {
    return value.some((tag) => tag.trim() === '' || tag.length > MAX_TAG_LENGTH)
      ? `Each tag must be 1-${MAX_TAG_LENGTH} characters`
      : null;
  }
  const invalid = value.filter((item) => !allowed.includes(item));
  return invalid.length > 0 ? `Unknown option(s): ${invalid.join(', ')}` : null;
}

function checkFiles(field: FormField, value: JsonValue): string | null {
  if (!Array.isArray(value)) return 'Must be a list of uploaded files';
  const max = field.multiple ? MAX_FILES : 1;
  if (value.length > max) return `Must contain at most ${max} file(s)`;
  return value.every((item) => fileReferenceSchema.safeParse(item).success)
    ? null
    : 'Each file must be a reference returned by the upload ({ id, name, size, contentType })';
}

export interface FieldValueCheckOptions {
  /** Skip "Disallow past dates" (used for default values and unchanged stored values). */
  skipConstraints?: boolean;
  now?: Date;
}

/**
 * Validates a non-empty value against its component configuration.
 * @returns an error message, or `null` when the value is valid.
 */
export function checkFieldValue(
  field: FormField,
  value: JsonValue,
  options: FieldValueCheckOptions = {},
): string | null {
  const now = options.now ?? new Date();

  switch (field.type) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? checkText(field, value) : 'Must be text';

    case 'email':
      if (typeof value !== 'string') return 'Must be text';
      if (value.length > MAX_TEXT_LENGTH) return `Must be at most ${MAX_TEXT_LENGTH} characters`;
      return emailSchema.safeParse(value).success ? null : 'Must be a valid email address';

    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'Must be a number';
      const { min, max } = field.validation ?? {};
      if (min !== undefined && value < min) return `Must be at least ${min}`;
      if (max !== undefined && value > max) return `Must be at most ${max}`;
      if (field.decimalDigits !== undefined) {
        const scaled = value * 10 ** field.decimalDigits;
        // Tolerance for binary floating point (e.g. 1.1 * 10 = 11.000000000000002).
        if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
          return `Must have at most ${field.decimalDigits} decimal digit(s)`;
        }
      }
      return null;
    }

    case 'date': {
      if (typeof value !== 'string' || !isoDateSchema.safeParse(value).success)
        return 'Must be a valid date (YYYY-MM-DD)';
      if (field.disallowPastDates && !options.skipConstraints) return checkPast(Date.parse(`${value}T23:59:59Z`), now);
      return null;
    }

    case 'time':
      return typeof value === 'string' && TIME_PATTERN.test(value) ? null : 'Must be a valid time (HH:mm, 24-hour)';

    case 'datetime': {
      if (typeof value !== 'string' || !isoDateTimeSchema.safeParse(value).success) {
        return 'Must be a valid ISO 8601 date-time';
      }
      if (field.disallowPastDates && !options.skipConstraints) return checkPast(Date.parse(value), now);
      return null;
    }

    case 'checkbox':
      return typeof value === 'boolean' ? null : 'Must be true or false';

    case 'radio':
    case 'select':
      if (typeof value !== 'string') return 'Must be one of the options';
      if (hasDynamicOptions(field)) return null;
      return optionValues(field).includes(value) ? null : `Must be one of: ${optionValues(field).join(', ')}`;

    case 'checklist':
    case 'taglist':
      return checkList(field, value);

    case 'filepicker':
      return checkFiles(field, value);

    case 'expression':
      // Computed in the browser (FEEL): any JSON value, bounded by the request shape.
      return null;

    default:
      return 'This component does not hold a value';
  }
}

/** Trims strings and removes duplicates from lists of strings so stored values are canonical. */
export function normalizeFieldValue(value: JsonValue): JsonValue {
  if (typeof value === 'string') return value.trim();
  if (isStringList(value)) return [...new Set(value.map((item) => item.trim()))];
  return value;
}
