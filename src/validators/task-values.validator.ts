import {
  CORE_TASK_KEYS,
  type FormField,
  type FormRow,
  isCoreKey,
  isValueField,
  type JsonValue,
  opensScope,
} from '../models/form-settings.model';
import type { Task } from '../models/task.model';
import { type ErrorDetail, ValidationError } from '../utils/errors';
import { checkFieldValue, isEmptyValue, MAX_DYNAMIC_LIST_ITEMS, normalizeFieldValue } from './field-value.rules';
import type { CreateTaskInput, UpdateTaskInput } from './task.validator';

/** Task values keyed by form key (core properties + custom fields). `null` means "clear this value". */
export type TaskValues = Record<string, JsonValue | null>;

type JsonObject = { [key: string]: JsonValue };

export type ValidationMode =
  /** POST: default values are applied and every required field must have a value. */
  | 'create'
  /** PUT: every required field must have a value. */
  | 'replace'
  /** PATCH: only the provided keys are checked (a provided group / list value is checked completely). */
  | 'patch';

export interface ValidateTaskValuesOptions {
  mode: ValidationMode;
  /** Stored task (PUT / PATCH): unchanged values skip time-based constraints such as "Disallow past dates". */
  existing?: Task;
  now?: Date;
}

/** Flattens a request body into `{ key: value }` (core properties + customFields). */
export function extractTaskValues(input: CreateTaskInput | UpdateTaskInput): TaskValues {
  const values: TaskValues = {};
  for (const key of CORE_TASK_KEYS) {
    const value = input[key];
    if (value !== undefined) values[key] = value;
  }
  for (const [key, value] of Object.entries(input.customFields ?? {})) {
    values[key] = value;
  }
  return values;
}

export function readTaskValue(task: Task, key: string): JsonValue | undefined {
  if (isCoreKey(key)) {
    const value = task[key];
    return Array.isArray(value) && value.length === 0 ? undefined : value;
  }
  return task.customFields[key];
}

function isPlainObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameValue(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Nested objects are stored without their empty values. */
function compact(values: TaskValues): JsonObject {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, JsonValue] => !isEmptyValue(entry[1])),
  );
}

/** A component that reads or writes a value in a scope. */
interface ScopeEntry {
  /** Key of a value component, or path of a group / dynamic list. */
  key: string;
  field: FormField;
  kind: 'value' | 'group' | 'list';
  /** The component or one of its containers has a hide condition: "required" is not enforced. */
  conditional: boolean;
}

/**
 * Lists the values of a scope. A group without a path is transparent (its children belong to the current
 * scope); a group with a path and a dynamic list are one entry each and open a nested scope.
 */
function collectScope(rows: FormRow[], conditional: boolean): ScopeEntry[] {
  return rows.flatMap((row) =>
    row.fields.flatMap((field): ScopeEntry[] => {
      const hidden = conditional || Boolean(field.conditional?.hide);
      if (field.type === 'group' && !field.path) return collectScope(field.rows ?? [], hidden);
      if (opensScope(field) && field.path) {
        return [{ key: field.path, field, kind: field.type === 'dynamiclist' ? 'list' : 'group', conditional: hidden }];
      }
      return isValueField(field) ? [{ key: field.key, field, kind: 'value', conditional: hidden }] : [];
    }),
  );
}

interface ScopeContext {
  mode: ValidationMode;
  /** Error path of a key of this scope (`title`, `customFields.client.name`, `customFields.items.0.name`...). */
  pathOf: (key: string) => string;
  /** Stored value of a key of this scope. */
  existing: (key: string) => JsonValue | undefined;
  now?: Date;
  errors: ErrorDetail[];
}

/** `undefined`: nothing to write (value left untouched, or invalid). `null`: clear the value. */
type EntryResult = JsonValue | null | undefined;

function validateValue(entry: ScopeEntry, values: TaskValues, ctx: ScopeContext): EntryResult {
  const { field, key } = entry;
  const label = field.label || key;
  const fail = (message: string) => {
    ctx.errors.push({ field: ctx.pathOf(key), message });
    return undefined;
  };
  const provided = Object.hasOwn(values, key);
  let value: JsonValue | null | undefined = provided ? values[key] : undefined;

  if (field.type === 'expression') {
    // Computed in the browser (FEEL): any bounded JSON value, never required, not evaluated here.
    if (provided) return value;
    return ctx.mode === 'create' ? undefined : null;
  }

  if (!provided && ctx.mode === 'create' && field.defaultValue !== undefined) value = field.defaultValue;

  if (isEmptyValue(value)) {
    // A required checkbox must be ticked (bpmn.io semantics); other required fields must not be empty.
    // Conditionally hidden components are not required: the browser drops their value when they are hidden.
    if (field.required && !entry.conditional) return fail(`${label} is required`);
    return provided || ctx.mode !== 'create' ? null : undefined;
  }

  const normalized = normalizeFieldValue(value as JsonValue);
  if (field.type === 'checkbox' && field.required && !entry.conditional && normalized !== true) {
    return fail(`${label} must be checked`);
  }

  const unchanged = sameValue(ctx.existing(key), normalized);
  const error = checkFieldValue(field, normalized, { skipConstraints: unchanged, now: ctx.now });
  return error ? fail(`${label}: ${error}`) : normalized;
}

/** Group with a path: a plain object whose children are validated as a nested scope. */
function validateGroup(entry: ScopeEntry, values: TaskValues, ctx: ScopeContext): EntryResult {
  const { field, key } = entry;
  const provided = Object.hasOwn(values, key);
  const value = provided ? values[key] : undefined;

  if (value !== undefined && value !== null && !isPlainObject(value)) {
    ctx.errors.push({ field: ctx.pathOf(key), message: `${field.label || key}: Must be an object` });
    return undefined;
  }

  const stored = ctx.existing(key);
  const nested = validateScope(collectScope(field.rows ?? [], entry.conditional), value ?? {}, {
    ...ctx,
    // Default values also apply inside groups on create.
    mode: ctx.mode === 'create' ? 'create' : 'replace',
    pathOf: (childKey) => `${ctx.pathOf(key)}.${childKey}`,
    existing: (childKey) => (isPlainObject(stored) ? stored[childKey] : undefined),
  });
  const result = compact(nested);
  if (Object.keys(result).length > 0) return result;
  return provided || ctx.mode !== 'create' ? null : undefined;
}

/** Dynamic list: an array of plain objects, each validated as a nested scope (no default values). */
function validateList(entry: ScopeEntry, values: TaskValues, ctx: ScopeContext): EntryResult {
  const { field, key } = entry;
  const label = field.label || key;
  const provided = Object.hasOwn(values, key);
  const value = provided ? values[key] : undefined;

  if (value === undefined || value === null) return provided || ctx.mode !== 'create' ? null : undefined;
  if (!Array.isArray(value)) {
    ctx.errors.push({ field: ctx.pathOf(key), message: `${label}: Must be a list` });
    return undefined;
  }
  if (value.length > MAX_DYNAMIC_LIST_ITEMS) {
    ctx.errors.push({
      field: ctx.pathOf(key),
      message: `${label}: Must contain at most ${MAX_DYNAMIC_LIST_ITEMS} items`,
    });
    return undefined;
  }

  const entries = collectScope(field.rows ?? [], entry.conditional);
  const stored = ctx.existing(key);
  const items = value.map((item, index) => {
    const itemPath = `${ctx.pathOf(key)}.${index}`;
    if (!isPlainObject(item)) {
      ctx.errors.push({ field: itemPath, message: `${label} item ${index + 1}: Must be an object` });
      return {};
    }
    const storedItem = Array.isArray(stored) ? stored[index] : undefined;
    return compact(
      validateScope(entries, item, {
        ...ctx,
        mode: 'replace',
        pathOf: (childKey) => `${itemPath}.${childKey}`,
        existing: (childKey) => (isPlainObject(storedItem) ? storedItem[childKey] : undefined),
      }),
    );
  });
  return items.length > 0 ? items : null;
}

/**
 * Validates the values of one scope (the task itself, a group with a path or a dynamic list item).
 * @returns the values to write, keyed by key (`null` = clear).
 */
function validateScope(entries: ScopeEntry[], values: TaskValues, ctx: ScopeContext): TaskValues {
  const known = new Set(entries.map((entry) => entry.key));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) ctx.errors.push({ field: ctx.pathOf(key), message: 'Field is not part of the task form' });
  }

  const result: TaskValues = {};
  for (const entry of entries) {
    if (ctx.mode === 'patch' && !Object.hasOwn(values, entry.key)) continue;
    const validate = entry.kind === 'group' ? validateGroup : entry.kind === 'list' ? validateList : validateValue;
    const value = validate(entry, values, ctx);
    if (value !== undefined) result[entry.key] = value;
  }
  return result;
}

/**
 * Validates task values against the organization's form (the component tree): unknown keys, required
 * values, value type, options, length / pattern / range rules, date constraints, and the nested values of
 * groups with a path and dynamic lists.
 *
 * Error paths: `title` (core key), `customFields.<key>`, `customFields.<group>.<key>`,
 * `customFields.<list>.<index>.<key>`.
 *
 * @returns normalized values (`null` = cleared) for the root keys that should be written.
 * @throws ValidationError (422) listing every invalid value.
 */
export function validateTaskValues(
  rows: FormRow[],
  input: TaskValues,
  { mode, existing, now }: ValidateTaskValuesOptions,
): TaskValues {
  const errors: ErrorDetail[] = [];
  const result = validateScope(collectScope(rows, false), input, {
    mode,
    pathOf: (key) => (isCoreKey(key) ? key : `customFields.${key}`),
    existing: (key) => (existing ? readTaskValue(existing, key) : undefined),
    now,
    errors,
  });

  if (errors.length > 0) throw new ValidationError(errors);
  return result;
}
