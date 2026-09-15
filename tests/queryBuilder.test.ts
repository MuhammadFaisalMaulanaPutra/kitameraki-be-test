import { describe, expect, it } from 'vitest';
import { SYSTEM_FIELDS } from '../src/domain/defaultSettings';
import { buildWhereClause } from '../src/repositories';

const organizationId = '00000000-0000-4000-8000-000000000001';

describe('Cosmos task query builder', () => {
  it('parameterizes user-provided search and filter values', () => {
    const attack = "x') OR true --";
    const result = buildWhereClause(
      organizationId,
      attack,
      [{ fieldId: 'title', operator: 'contains', value: attack }],
      SYSTEM_FIELDS,
    );

    expect(result.clause).not.toContain(attack);
    expect(result.clause).toContain('CONTAINS(c.title, @q, true)');
    expect(result.parameters).toContainEqual({ name: '@q', value: attack });
    expect(result.parameters).toContainEqual({ name: '@filter0', value: attack });
  });

  it('combines filters with AND and supports date ranges', () => {
    const result = buildWhereClause(
      organizationId,
      undefined,
      [
        { fieldId: 'status', operator: 'equals', value: 'todo' },
        {
          fieldId: 'dueDate',
          operator: 'between',
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.000Z',
        },
      ],
      SYSTEM_FIELDS,
    );

    expect(result.clause).toContain(
      'c.status = @filter0 AND c.dueDate >= @filter1From AND c.dueDate <= @filter1To',
    );
  });

  it('only interpolates validated custom field IDs as property paths', () => {
    const fields = [
      ...SYSTEM_FIELDS,
      {
        id: 'custom-11111111-1111-4111-8111-111111111111',
        label: 'Email',
        kind: 'custom' as const,
        type: 'email' as const,
        required: false,
      },
    ];
    const result = buildWhereClause(
      organizationId,
      undefined,
      [{ fieldId: fields.at(-1)!.id, operator: 'contains', value: '@example.com' }],
      fields,
    );

    expect(result.clause).toContain(
      'c.customFields["custom-11111111-1111-4111-8111-111111111111"]',
    );
  });

  it('searches custom text/email fields but not custom date fields', () => {
    const fields = [
      ...SYSTEM_FIELDS,
      {
        id: 'custom-11111111-1111-4111-8111-111111111111',
        label: 'Text',
        kind: 'custom' as const,
        type: 'text' as const,
        required: false,
      },
      {
        id: 'custom-22222222-2222-4222-8222-222222222222',
        label: 'Date',
        kind: 'custom' as const,
        type: 'date' as const,
        required: false,
      },
    ];
    const result = buildWhereClause(organizationId, 'needle', [], fields);

    expect(result.clause).toContain(fields[6]!.id);
    expect(result.clause).not.toContain(fields[7]!.id);
    expect(result.clause).toContain('tag IN c.tags');
  });

  it('supports tag contains, ordinary contains, and open-ended ranges', () => {
    const result = buildWhereClause(
      organizationId,
      undefined,
      [
        { fieldId: 'tags', operator: 'contains', value: 'backend' },
        { fieldId: 'description', operator: 'contains', value: 'cosmos' },
        { fieldId: 'dueDate', operator: 'between', from: '2026-09-14T00:00:00.000Z' },
        { fieldId: 'dueDate', operator: 'between', to: '2026-09-21T00:00:00.000Z' },
      ],
      SYSTEM_FIELDS,
    );

    expect(result.clause).toContain('tag IN c.tags');
    expect(result.clause).toContain('CONTAINS(c.description, @filter1, true)');
    expect(result.clause).toContain('c.dueDate >= @filter2From');
    expect(result.clause).toContain('c.dueDate <= @filter3To');
  });

  it('rejects unknown filter fields and unexpected system fields', () => {
    expect(() =>
      buildWhereClause(
        organizationId,
        undefined,
        [{ fieldId: 'missing', operator: 'contains', value: 'value' }],
        SYSTEM_FIELDS,
      ),
    ).toThrow(/Unknown filter field/);

    const unexpected = {
      id: 'unexpected',
      label: 'Unexpected',
      kind: 'system' as const,
      type: 'text' as const,
      required: false,
    };
    expect(() =>
      buildWhereClause(
        organizationId,
        undefined,
        [{ fieldId: unexpected.id, operator: 'contains', value: 'value' }],
        [...SYSTEM_FIELDS, unexpected],
      ),
    ).toThrow(/Invalid system field ID/);
  });

  it('rejects unsafe custom field paths even when called outside request validation', () => {
    const fields = [
      ...SYSTEM_FIELDS,
      {
        id: 'custom-bad"] OR true',
        label: 'Unsafe',
        kind: 'custom' as const,
        type: 'text' as const,
        required: false,
      },
    ];

    expect(() =>
      buildWhereClause(
        organizationId,
        undefined,
        [{ fieldId: fields.at(-1)!.id, operator: 'contains', value: 'value' }],
        fields,
      ),
    ).toThrow(/Invalid custom field ID/);
  });
});
