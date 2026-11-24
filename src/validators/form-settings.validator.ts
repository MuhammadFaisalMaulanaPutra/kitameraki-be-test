import safeRegex from 'safe-regex2';
import { z } from 'zod';
import {
  BUTTON_ACTIONS,
  COMPUTE_ON,
  CORE_KEY_ALLOWED_TYPES,
  DATA_FIELD_TYPES,
  FIELD_TYPES,
  GRID_COLUMNS,
  IFRAME_SECURITY_FLAGS,
  type IframeSecurityFlag,
  isCoreKey,
  MAX_FIELDS_PER_ROW,
  MAX_NESTING_DEPTH,
  MIN_FIELD_COLUMNS,
  NESTING_FIELD_TYPES,
  OPTION_FIELD_TYPES,
  opensScope,
  TIME_INTERVALS,
  VALIDATION_PATTERNS,
  VALUE_FIELD_TYPES,
  VERTICAL_ALIGNMENTS,
} from '../models/form-settings.model';
import { identifierSchema } from './common.validator';
import { checkFieldValue, compileCustomPattern, isEmptyValue, MAX_TEXT_LENGTH } from './field-value.rules';

/** Safety nets against oversized documents (Cosmos DB items are limited to 2 MB). */
export const MAX_FORM_ROWS = 500;
export const MAX_FORM_COMPONENTS = 500;
export const MAX_OPTIONS = 100;
export const MAX_TABLE_COLUMNS = 30;
export const MAX_CUSTOM_PROPERTIES = 50;
export const MAX_FEEL_LENGTH = 500;
export const MAX_URL_LENGTH = 2000;

/** Image view source: http(s) URL, data URI of an image or a FEEL expression. */
const IMAGE_SOURCE_PATTERN = /^(https?:\/\/|data:image\/|=)/i;
/** iFrame URL: https only (no mixed content, no javascript: / data: documents) or a FEEL expression. */
const IFRAME_URL_PATTERN = /^(https:\/\/|=)/i;

/** Whole number in a range, with a readable message. */
const integer = (min: number, max: number) =>
  z
    .number()
    .int('Must be a whole number')
    .min(min, `Must be between ${min} and ${max}`)
    .max(max, `Must be between ${min} and ${max}`);

/**
 * FEEL expression ("=..."). Expressions are evaluated in the browser (bpmn.io FEEL via feelin); feelin is
 * ESM-only, so the API does not evaluate them and only checks their shape.
 */
export const feelExpressionSchema = z
  .string()
  .trim()
  .max(MAX_FEEL_LENGTH, `Expression must be at most ${MAX_FEEL_LENGTH} characters`)
  // One (continuable) issue per value, so the checks of the whole component tree still run.
  .superRefine((value, ctx) => {
    if (!value.startsWith('=')) {
      ctx.addIssue({ code: 'custom', message: 'Must be a FEEL expression starting with "="' });
    } else if (value.slice(1).trim() === '') {
      ctx.addIssue({ code: 'custom', message: 'Expression must not be empty' });
    }
  });

/** Default value entry of the properties panel. */
export const fieldValueSchema = z.union([
  z.string().max(MAX_TEXT_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(100)).max(50),
]);

const optionSchema = z.strictObject({
  label: z.string().trim().min(1, 'Option label is required').max(100, 'Option label must be at most 100 characters'),
  value: z.string().trim().min(1, 'Option value is required').max(50, 'Option value must be at most 50 characters'),
});

const validationSchema = z.strictObject({
  minLength: z.number().int().min(0).max(MAX_TEXT_LENGTH).optional(),
  maxLength: z.number().int().min(1).max(MAX_TEXT_LENGTH).optional(),
  pattern: z.enum(VALIDATION_PATTERNS).optional(),
  customPattern: z.string().max(200, 'Regular expression must be at most 200 characters').optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
});

const tableColumnSchema = z.strictObject({
  label: z.string().trim().min(1, 'Column label is required').max(100, 'Column label must be at most 100 characters'),
  key: identifierSchema,
});

const iframeSecuritySchema = z.strictObject(
  Object.fromEntries(IFRAME_SECURITY_FLAGS.map((flag) => [flag, z.boolean().optional()])) as Record<
    IframeSecurityFlag,
    z.ZodOptional<z.ZodBoolean>
  >,
);

/** Custom properties: free key/value pairs (not interpreted by the app). */
const customPropertiesSchema = z
  .record(z.string(), z.string().max(500, 'Value must be at most 500 characters'))
  .superRefine((properties, ctx) => {
    const names = Object.keys(properties);
    if (names.length > MAX_CUSTOM_PROPERTIES) {
      ctx.addIssue({ code: 'custom', message: `At most ${MAX_CUSTOM_PROPERTIES} custom properties` });
    }
    for (const name of names) {
      if (name.length < 1 || name.length > 100) {
        ctx.addIssue({ code: 'custom', path: [name], message: 'Property name must be 1-100 characters' });
      }
    }
  });

const enumOf = <const T extends readonly [string, ...string[]]>(values: T, name: string) =>
  z.enum(values, { error: `${name} must be one of: ${values.join(', ')}` });

/**
 * A form component. Type-specific rules (required properties, ranges per type, scopes...) are checked by
 * {@link refineField} and {@link walkRows}, which see the whole tree.
 */
const fieldSchema = z.strictObject({
  id: identifierSchema,
  type: enumOf(FIELD_TYPES, 'Type'),
  key: identifierSchema.optional(),
  path: identifierSchema.optional(),
  label: z.string().trim().max(100, 'Label must be at most 100 characters').optional(),
  description: z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
  placeholder: z.string().trim().max(200, 'Placeholder must be at most 200 characters').optional(),
  defaultValue: fieldValueSchema.optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readOnly: z.union([z.boolean(), feelExpressionSchema]).optional(),
  searchable: z.boolean().optional(),
  options: z.array(optionSchema).max(MAX_OPTIONS, `At most ${MAX_OPTIONS} options`).optional(),
  valuesKey: identifierSchema.optional(),
  valuesExpression: feelExpressionSchema.optional(),
  prefix: z.string().max(20, 'Prefix must be at most 20 characters').optional(),
  suffix: z.string().max(20, 'Suffix must be at most 20 characters').optional(),
  validation: validationSchema.optional(),
  disallowPastDates: z.boolean().optional(),
  use24h: z.boolean().optional(),
  timeInterval: z
    .literal(TIME_INTERVALS, { error: `Time interval must be one of: ${TIME_INTERVALS.join(', ')}` })
    .optional(),
  decimalDigits: z.number().int().min(0).max(10).optional(),
  increment: z.number().positive().finite().optional(),
  text: z.string().max(5000, 'Text must be at most 5000 characters').optional(),
  content: z.string().max(10_000, 'Content must be at most 10000 characters').optional(),
  // Spacer 8-400, iFrame 50-2000: checked per type.
  height: integer(8, 2000).optional(),
  expression: feelExpressionSchema.optional(),
  computeOn: enumOf(COMPUTE_ON, 'Compute on').optional(),
  accept: z.string().trim().max(200, 'Supported formats must be at most 200 characters').optional(),
  multiple: z.boolean().optional(),
  source: z.string().trim().max(MAX_URL_LENGTH, `Source must be at most ${MAX_URL_LENGTH} characters`).optional(),
  alt: z.string().trim().max(200, 'Alternative text must be at most 200 characters').optional(),
  url: z.string().trim().max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`).optional(),
  security: iframeSecuritySchema.optional(),
  dataSource: feelExpressionSchema.optional(),
  rowCount: integer(1, 100).optional(),
  columns: z.array(tableColumnSchema).max(MAX_TABLE_COLUMNS, `At most ${MAX_TABLE_COLUMNS} columns`).optional(),
  columnsExpression: feelExpressionSchema.optional(),
  maxHeight: integer(50, 2000).optional(),
  showOutline: z.boolean().optional(),
  verticalAlignment: enumOf(VERTICAL_ALIGNMENTS, 'Vertical alignment').optional(),
  defaultRepetitions: integer(0, 50).optional(),
  allowAddRemove: z.boolean().optional(),
  disableCollapse: z.boolean().optional(),
  nonCollapsedItems: integer(1, 50).optional(),
  action: enumOf(BUTTON_ACTIONS, 'Action').optional(),
  conditional: z.strictObject({ hide: feelExpressionSchema.optional() }).optional(),
  layout: z.strictObject({ columns: integer(MIN_FIELD_COLUMNS, GRID_COLUMNS).optional() }).optional(),
  properties: customPropertiesSchema.optional(),
  // Group / dynamic list content (recursive).
  get rows(): z.ZodOptional<z.ZodArray<typeof formRowSchema>> {
    return z.array(formRowSchema).max(MAX_FORM_ROWS, `At most ${MAX_FORM_ROWS} rows`).optional();
  },
});

const formRowSchema = z.strictObject({
  id: identifierSchema,
  fields: z
    .array(fieldSchema)
    .min(1, 'A row must contain at least one field')
    .max(MAX_FIELDS_PER_ROW, `A row can contain at most ${MAX_FIELDS_PER_ROW} fields`),
});

type FieldInput = z.output<typeof fieldSchema>;
type RowInput = z.output<typeof formRowSchema>;
type IssuePath = (string | number)[];

/** Rules that depend on the component type or on several properties of one component. */
function refineField(field: FieldInput, path: IssuePath, ctx: z.RefinementCtx): void {
  const issue = (subPath: IssuePath, message: string) =>
    ctx.addIssue({ code: 'custom', path: [...path, ...subPath], message });
  const isData = DATA_FIELD_TYPES.includes(field.type);

  if (VALUE_FIELD_TYPES.includes(field.type) && !field.key) issue(['key'], 'Key is required');
  if ((isData || field.type === 'button') && !field.label) issue(['label'], 'Label is required');

  if (NESTING_FIELD_TYPES.includes(field.type)) {
    if (!field.rows) issue(['rows'], 'Rows are required (the list may be empty)');
    if (field.type === 'dynamiclist' && !field.path) issue(['path'], 'Path is required');
  } else if (field.rows) {
    issue(['rows'], 'Only groups and dynamic lists can contain rows');
  }

  switch (field.type) {
    case 'expression':
      if (!field.expression) issue(['expression'], 'Expression is required');
      break;
    case 'table': {
      if (!field.dataSource) issue(['dataSource'], 'Data source is required');
      const columns = field.columns ?? [];
      if (columns.length > 0 && field.columnsExpression) {
        issue(['columns'], 'Use either static columns or a columns expression, not both');
      } else if (columns.length === 0 && !field.columnsExpression) {
        issue(['columns'], 'Add at least one column or a columns expression');
      }
      const keys = new Set<string>();
      columns.forEach((column, index) => {
        if (keys.has(column.key)) issue(['columns', index, 'key'], `Duplicate column key "${column.key}"`);
        keys.add(column.key);
      });
      break;
    }
    case 'documentPreview':
      if (!field.dataSource) issue(['dataSource'], 'Data source is required');
      break;
    case 'image':
      if (field.source && !IMAGE_SOURCE_PATTERN.test(field.source)) {
        issue(['source'], 'Source must be an http(s) URL, a data:image URI or a FEEL expression');
      }
      break;
    case 'iframe':
      if (field.url && !IFRAME_URL_PATTERN.test(field.url))
        issue(['url'], 'URL must use https or be a FEEL expression');
      if (field.height !== undefined && field.height < 50) issue(['height'], 'Must be between 50 and 2000');
      break;
    case 'spacer':
      if (field.height !== undefined && field.height > 400) issue(['height'], 'Must be between 8 and 400');
      break;
    case 'button':
      if (!field.action) issue(['action'], `Action is required (${BUTTON_ACTIONS.join(' or ')})`);
      break;
  }

  if (OPTION_FIELD_TYPES.includes(field.type)) {
    const options = field.options ?? [];
    const sources = [options.length > 0, Boolean(field.valuesKey), Boolean(field.valuesExpression)].filter(Boolean);
    if (sources.length > 1) {
      issue(['options'], 'Use only one options source: static options, input data (valuesKey) or an expression');
    } else if (sources.length === 0 && field.type !== 'taglist') {
      issue(['options'], 'Add at least one option');
    }
    const seen = new Set<string>();
    options.forEach((option, index) => {
      if (seen.has(option.value)) issue(['options', index, 'value'], `Duplicate option value "${option.value}"`);
      seen.add(option.value);
    });
  }

  const { minLength, maxLength, pattern, customPattern, min, max } = field.validation ?? {};
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    issue(['validation', 'minLength'], 'Minimum length must not exceed maximum length');
  }
  if (min !== undefined && max !== undefined && min > max)
    issue(['validation', 'min'], 'Minimum must not exceed maximum');
  if (pattern === 'custom') {
    if (!customPattern) {
      issue(['validation', 'customPattern'], 'Custom regular expression is required');
    } else {
      try {
        compileCustomPattern(customPattern);
        // The pattern runs on the server for every task: reject patterns prone to catastrophic backtracking (ReDoS).
        if (!safeRegex(customPattern)) issue(['validation', 'customPattern'], 'Regular expression is too complex');
      } catch {
        issue(['validation', 'customPattern'], 'Invalid regular expression');
      }
    }
  }

  // Expression values are computed in the browser, so their default value is not checked.
  if (field.defaultValue !== undefined && isData && !isEmptyValue(field.defaultValue)) {
    const error = checkFieldValue(field, field.defaultValue, { skipConstraints: true });
    if (error) issue(['defaultValue'], `Default value: ${error}`);
  }
}

/**
 * Core keys are bound to the task's own properties: they must stay in the root scope, use a compatible
 * component type and (status / priority) static options so filters keep working.
 */
function refineCoreKey(
  field: FieldInput,
  property: 'key' | 'path',
  path: IssuePath,
  rootScope: boolean,
  ctx: z.RefinementCtx,
) {
  const name = field[property];
  if (!name || !isCoreKey(name)) return;
  const issue = (subPath: IssuePath, message: string) =>
    ctx.addIssue({ code: 'custom', path: [...path, ...subPath], message });

  if (!rootScope) {
    issue(
      [property],
      `Key "${name}" is bound to the task and cannot be used inside a group with a path or a dynamic list`,
    );
  } else if (!CORE_KEY_ALLOWED_TYPES[name].includes(field.type)) {
    issue(['type'], `Key "${name}" can only be used by: ${CORE_KEY_ALLOWED_TYPES[name].join(', ')}`);
  } else if ((name === 'priority' || name === 'status') && (field.valuesKey || field.valuesExpression)) {
    issue([field.valuesKey ? 'valuesKey' : 'valuesExpression'], `Key "${name}" must use static options`);
  }
}

interface WalkState {
  ctx: z.RefinementCtx;
  rowIds: Set<string>;
  fieldIds: Set<string>;
  components: number;
}

interface Scope {
  /** Keys of the value components and container paths of the scope. */
  keys: Set<string>;
  /** Root scope (not inside a group with a path or a dynamic list). */
  root: boolean;
}

/**
 * Walks the component tree: ids are unique in the whole document, keys are unique per scope (the root, and
 * one scope per group with a path / dynamic list; a group without a path shares its parent's scope).
 * @param depth number of containers (group / dynamic list) around `rows` (0 for the form itself).
 */
function walkRows(rows: RowInput[], path: IssuePath, scope: Scope, depth: number, state: WalkState): void {
  const { ctx } = state;
  const issue = (issuePath: IssuePath, message: string) => ctx.addIssue({ code: 'custom', path: issuePath, message });

  rows.forEach((row, rowIndex) => {
    const rowPath = [...path, rowIndex];
    if (state.rowIds.has(row.id)) issue([...rowPath, 'id'], `Duplicate row id "${row.id}"`);
    state.rowIds.add(row.id);

    // bpmn.io 16-column grid: components without "Columns" take at least 2 columns.
    const explicit = row.fields.reduce((sum, field) => sum + (field.layout?.columns ?? 0), 0);
    const automatic = row.fields.filter((field) => field.layout?.columns === undefined).length;
    if (explicit + MIN_FIELD_COLUMNS * automatic > GRID_COLUMNS) {
      issue([...rowPath, 'fields'], `Columns exceed the maximum of ${GRID_COLUMNS} per row`);
    }

    row.fields.forEach((field, fieldIndex) => {
      const fieldPath = [...rowPath, 'fields', fieldIndex];
      state.components += 1;
      if (state.fieldIds.has(field.id)) issue([...fieldPath, 'id'], `Duplicate field id "${field.id}"`);
      state.fieldIds.add(field.id);

      if (field.key && VALUE_FIELD_TYPES.includes(field.type)) {
        if (scope.keys.has(field.key)) issue([...fieldPath, 'key'], `Duplicate key "${field.key}"`);
        scope.keys.add(field.key);
      }
      if (field.path && opensScope(field)) {
        if (scope.keys.has(field.path)) issue([...fieldPath, 'path'], `Duplicate key "${field.path}"`);
        scope.keys.add(field.path);
      }
      refineCoreKey(field, 'key', fieldPath, scope.root, ctx);
      if (opensScope(field)) refineCoreKey(field, 'path', fieldPath, scope.root, ctx);
      refineField(field, fieldPath, ctx);

      if (field.rows && NESTING_FIELD_TYPES.includes(field.type)) {
        const level = depth + 1;
        // Reported once, on the first container that is too deep.
        if (level === MAX_NESTING_DEPTH + 1) {
          issue(fieldPath, `Containers can be nested at most ${MAX_NESTING_DEPTH} levels deep`);
        }
        const childScope = opensScope(field) ? { keys: new Set<string>(), root: false } : scope;
        walkRows(field.rows, [...fieldPath, 'rows'], childScope, level, state);
      }
    });
  });
}

export const updateFormSettingsSchema = z
  .strictObject({
    rows: z.array(formRowSchema).max(MAX_FORM_ROWS, `A form can contain at most ${MAX_FORM_ROWS} rows`),
    versionTag: z.string().trim().max(50, 'Version tag must be at most 50 characters').optional(),
  })
  .superRefine((settings, ctx) => {
    const state: WalkState = { ctx, rowIds: new Set(), fieldIds: new Set(), components: 0 };
    walkRows(settings.rows, ['rows'], { keys: new Set(), root: true }, 0, state);
    if (state.components > MAX_FORM_COMPONENTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['rows'],
        message: `A form can contain at most ${MAX_FORM_COMPONENTS} components`,
      });
    }
  });

export type UpdateFormSettingsInput = z.output<typeof updateFormSettingsSchema>;
