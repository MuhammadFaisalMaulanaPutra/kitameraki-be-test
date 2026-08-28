import { ValidationError, ValidationIssue } from '../errors/AppError';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, field = 'body'): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ValidationError([{ field, message: `${field} must be a JSON object.` }]);
  }
  return value;
}

export function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  prefix = '',
): void {
  const allowed = new Set(allowedKeys);
  const issues: ValidationIssue[] = Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => ({
      field: prefix ? `${prefix}.${key}` : key,
      message: 'Field is not allowed.',
    }));

  if (issues.length) {
    throw new ValidationError(issues);
  }
}

export function validateIdentifier(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError([{ field, message: `${field} must be a string.` }]);
  }

  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(normalized)) {
    throw new ValidationError([
      {
        field,
        message: `${field} must be 1-100 characters and contain only letters, numbers, dot, underscore, or hyphen.`,
      },
    ]);
  }
  return normalized;
}

export function validateNonEmptyString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError([{ field, message: `${field} must be a string.` }]);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError([{ field, message: `${field} is required.` }]);
  }
  if (normalized.length > maxLength) {
    throw new ValidationError([{ field, message: `${field} must be at most ${maxLength} characters.` }]);
  }
  return normalized;
}

export function validateOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
  allowNull = false,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null && allowNull) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ValidationError([{ field, message: `${field} must be a string${allowNull ? ' or null' : ''}.` }]);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ValidationError([{ field, message: `${field} must be at most ${maxLength} characters.` }]);
  }
  return normalized;
}

export function validateIsoDateTime(value: unknown, field: string, allowNull = false): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null && allowNull) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ValidationError([{ field, message: `${field} must be a valid ISO date-time string.` }]);
  }

  const normalized = value.trim();
  const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoDateTimePattern.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new ValidationError([{ field, message: `${field} must be a valid ISO date-time string including a timezone.` }]);
  }

  // Date.parse normalizes some invalid calendar dates, so validate the date component independently.
  validateDate(normalized.slice(0, 10), field);
  return normalized;
}

export function validateDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError([{ field, message: `${field} must use YYYY-MM-DD format.` }]);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError([{ field, message: `${field} must contain a valid calendar date.` }]);
  }
  return value;
}
