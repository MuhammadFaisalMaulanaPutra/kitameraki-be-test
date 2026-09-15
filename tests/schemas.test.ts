import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM_SETTINGS } from '../src/domain/defaultSettings';
import {
  parseFormSettings,
  parseListQuery,
  parseTaskInput,
  parseTaskPatch,
  validateFilters,
} from '../src/domain/schemas';
import { AppError } from '../src/errors';
import type { CustomFieldType, FieldDefinition, FormRow } from '../src/domain/models';

const customId = (index: number): string =>
  `custom-00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

const createLargeSettings = (customFieldCount: number) => {
  const customFields: FieldDefinition[] = Array.from({ length: customFieldCount }, (_, index) => ({
    id: customId(index),
    label: `Custom ${index}`,
    kind: 'custom',
    type: 'text',
    required: false,
  }));
  const customRows: FormRow[] = customFields.map((field, index) => ({
    id: `custom-row-${index}`,
    fieldIds: [field.id],
  }));
  return {
    fields: [...DEFAULT_FORM_SETTINGS.fields, ...customFields],
    rows: [...DEFAULT_FORM_SETTINGS.rows, ...customRows],
  };
};

describe('request schemas', () => {
  it('accepts default settings and renamed built-in labels', () => {
    const renamed = {
      ...DEFAULT_FORM_SETTINGS,
      fields: DEFAULT_FORM_SETTINGS.fields.map((field) =>
        field.id === 'title' ? { ...field, label: 'Task name' } : field,
      ),
    };

    expect(parseFormSettings(renamed).fields[0]?.label).toBe('Task name');
  });

  it('supports more than 100 rows without a business row limit', () => {
    expect(parseFormSettings(createLargeSettings(101)).rows).toHaveLength(105);
  });

  it('accepts all custom field types required by the assignment', () => {
    const types: CustomFieldType[] = ['text', 'date', 'datetime', 'email'];
    const settings = createLargeSettings(types.length);
    settings.fields = settings.fields.map((field, index) =>
      field.kind === 'custom'
        ? { ...field, type: types[index - DEFAULT_FORM_SETTINGS.fields.length]! }
        : field,
    );

    expect(
      parseFormSettings(settings)
        .fields.filter((field) => field.kind === 'custom')
        .map((field) => field.type),
    ).toEqual(types);
  });

  it('rejects rows with more than two columns', () => {
    const invalid = {
      ...DEFAULT_FORM_SETTINGS,
      rows: [
        { id: 'row-all', fieldIds: ['title', 'description', 'dueDate'] },
        ...DEFAULT_FORM_SETTINGS.rows.slice(2),
      ],
    };
    expect(() => parseFormSettings(invalid)).toThrow(AppError);
  });

  it('rejects duplicate field and row IDs', () => {
    expect(() =>
      parseFormSettings({
        ...DEFAULT_FORM_SETTINGS,
        fields: [DEFAULT_FORM_SETTINGS.fields[0], ...DEFAULT_FORM_SETTINGS.fields],
        rows: [{ id: 'duplicate-field', fieldIds: ['title'] }, ...DEFAULT_FORM_SETTINGS.rows],
      }),
    ).toThrow(/Field IDs must be unique/);

    expect(() =>
      parseFormSettings({
        ...DEFAULT_FORM_SETTINGS,
        rows: DEFAULT_FORM_SETTINGS.rows.map((row, index) => ({
          ...row,
          id: index < 2 ? 'same-row' : row.id,
        })),
      }),
    ).toThrow(/Row IDs must be unique/);
  });

  it('requires every field exactly once in the layout', () => {
    expect(() =>
      parseFormSettings({
        ...DEFAULT_FORM_SETTINGS,
        rows: DEFAULT_FORM_SETTINGS.rows.map((row) => ({
          ...row,
          fieldIds: row.fieldIds.filter((id) => id !== 'tags'),
        })),
      }),
    ).toThrow(/Every field must appear/);
  });

  it('protects built-in field structure', () => {
    const invalid = {
      ...DEFAULT_FORM_SETTINGS,
      fields: DEFAULT_FORM_SETTINGS.fields.map((field) =>
        field.id === 'title' ? { ...field, type: 'email' } : field,
      ),
    };
    expect(() => parseFormSettings(invalid)).toThrow(/cannot be removed or structurally changed/);
  });

  it('rejects missing and unknown built-in fields', () => {
    expect(() =>
      parseFormSettings({
        fields: DEFAULT_FORM_SETTINGS.fields.filter((field) => field.id !== 'tags'),
        rows: DEFAULT_FORM_SETTINGS.rows.filter((row) => !row.fieldIds.includes('tags')),
      }),
    ).toThrow(/built-in fields are required/);

    const unknown = {
      id: 'unexpected',
      label: 'Unexpected',
      kind: 'system' as const,
      type: 'text' as const,
      required: false,
    };
    expect(() =>
      parseFormSettings({
        fields: [...DEFAULT_FORM_SETTINGS.fields, unknown],
        rows: [...DEFAULT_FORM_SETTINGS.rows, { id: 'unknown-row', fieldIds: [unknown.id] }],
      }),
    ).toThrow(/Unknown built-in field/);
  });

  it('rejects unstable custom field IDs and required custom fields', () => {
    const unstable = createLargeSettings(1);
    unstable.fields = unstable.fields.map((field) =>
      field.kind === 'custom' ? { ...field, id: 'custom-unstable' } : field,
    );
    unstable.rows = unstable.rows.map((row) =>
      row.id === 'custom-row-0' ? { ...row, fieldIds: ['custom-unstable'] } : row,
    );
    expect(() => parseFormSettings(unstable)).toThrow(/Invalid custom field ID/);

    const required = createLargeSettings(1);
    required.fields = required.fields.map((field) =>
      field.kind === 'custom' ? { ...field, required: true } : field,
    );
    expect(() => parseFormSettings(required)).toThrow(AppError);
  });

  it('rejects immutable and unknown task properties', () => {
    expect(() =>
      parseTaskInput({
        id: 'unsafe',
        title: 'Task',
        status: 'todo',
        tags: [],
        customFields: {},
      }),
    ).toThrow(AppError);
  });

  it('parses partial task updates and rejects empty patches', () => {
    expect(parseTaskPatch({ status: 'completed' })).toEqual({ status: 'completed' });
    expect(() => parseTaskPatch({})).toThrow(AppError);
  });

  it('parses pagination and encoded filters', () => {
    const query = new URLSearchParams({
      page: '2',
      pageSize: '25',
      filters: JSON.stringify([{ fieldId: 'status', operator: 'equals', value: 'todo' }]),
    });
    expect(parseListQuery(query)).toMatchObject({
      page: 2,
      pageSize: 25,
      filters: [{ fieldId: 'status', operator: 'equals', value: 'todo' }],
    });
  });

  it('rejects more than 20 filters', () => {
    const filters = Array.from({ length: 21 }, (_, index) => ({
      fieldId: `field-${index}`,
      operator: 'contains',
      value: 'value',
    }));
    expect(() => parseListQuery(new URLSearchParams({ filters: JSON.stringify(filters) }))).toThrow(
      AppError,
    );
  });

  it.each([
    [new URLSearchParams({ page: '0' }), 'positive integers'],
    [new URLSearchParams({ page: '10001' }), 'cannot exceed 10,000'],
    [new URLSearchParams({ page: '9007199254740992' }), 'positive integers'],
    [new URLSearchParams({ pageSize: '51' }), 'cannot exceed 50'],
    [new URLSearchParams({ q: 'x'.repeat(101) }), 'cannot exceed 100'],
    [new URLSearchParams({ filters: '{' }), 'valid JSON'],
    [new URLSearchParams({ filters: '{}' }), 'request is invalid'],
  ])('rejects invalid list query values', (query, message) => {
    expect(() => parseListQuery(query)).toThrow(message);
  });

  it('validates filter operators and enum/date values against field definitions', () => {
    expect(() =>
      validateFilters(
        [{ fieldId: 'missing', operator: 'contains', value: 'x' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/Unknown filter field/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'dueDate', operator: 'contains', value: 'x' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/Invalid filter operator/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'status', operator: 'contains', value: 'todo' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/requires an equals/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'title', operator: 'equals', value: 'task' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/requires a contains/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'dueDate', operator: 'between', from: 'invalid' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/invalid date range/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'status', operator: 'equals', value: 'invalid' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/Invalid status/);
    expect(() =>
      validateFilters(
        [{ fieldId: 'priority', operator: 'equals', value: 'invalid' }],
        DEFAULT_FORM_SETTINGS.fields,
      ),
    ).toThrow(/Invalid priority/);
  });

  it('accepts valid text, enum, date, and datetime filters', () => {
    const fields = [
      ...DEFAULT_FORM_SETTINGS.fields,
      {
        id: customId(900),
        label: 'Date',
        kind: 'custom' as const,
        type: 'date' as const,
        required: false,
      },
    ];
    expect(() =>
      validateFilters(
        [
          { fieldId: 'title', operator: 'contains', value: 'task' },
          { fieldId: 'status', operator: 'equals', value: 'todo' },
          { fieldId: 'priority', operator: 'equals', value: 'high' },
          {
            fieldId: 'dueDate',
            operator: 'between',
            from: '2026-09-14T00:00:00.000Z',
          },
          { fieldId: customId(900), operator: 'between', to: '2026-09-15' },
        ],
        fields,
      ),
    ).not.toThrow();
  });
});
