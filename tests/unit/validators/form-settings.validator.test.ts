import { createTemplateRows } from '../../../src/models/form-settings.model';
import { updateFormSettingsSchema } from '../../../src/validators/form-settings.validator';
import { checklistList, clientGroup, summaryExpression } from '../../helpers/form-fixtures';

const row = (id: string, ...fields: Record<string, unknown>[]) => ({ id, fields });
const text = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'text',
  key: id,
  label: `Label ${id}`,
  ...overrides,
});
const group = (id: string, rows: unknown[], overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'group',
  label: `Group ${id}`,
  rows,
  ...overrides,
});
const list = (id: string, rows: unknown[], overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'dynamiclist',
  path: id,
  label: `List ${id}`,
  rows,
  ...overrides,
});

function messagesOf(rows: unknown[], extra: Record<string, unknown> = {}): string[] {
  const result = updateFormSettingsSchema.safeParse({ rows, ...extra });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('updateFormSettingsSchema', () => {
  it('accepts the task template (with its Submit / Reset buttons)', () => {
    expect(updateFormSettingsSchema.safeParse({ rows: createTemplateRows() }).success).toBe(true);
  });

  it('accepts every component type with its properties', () => {
    const rows = [
      row('r1', text('name', { validation: { minLength: 2, maxLength: 50, pattern: 'phone' }, prefix: '+' }), {
        id: 'notes',
        type: 'textarea',
        key: 'notes',
        label: 'Notes',
      }),
      row(
        'r2',
        {
          id: 'estimate',
          type: 'number',
          key: 'estimate',
          label: 'Estimate',
          decimalDigits: 1,
          increment: 0.5,
          validation: { min: 0, max: 40 },
        },
        { id: 'email', type: 'email', key: 'email', label: 'Email', defaultValue: 'qa@example.com' },
      ),
      row(
        'r3',
        { id: 'start', type: 'date', key: 'start', label: 'Start', disallowPastDates: true },
        { id: 'meeting', type: 'datetime', key: 'meeting', label: 'Meeting', use24h: true, timeInterval: 15 },
      ),
      row(
        'r4',
        { id: 'billable', type: 'checkbox', key: 'billable', label: 'Billable', defaultValue: true },
        {
          id: 'channels',
          type: 'checklist',
          key: 'channels',
          label: 'Channels',
          options: [{ label: 'Mail', value: 'mail' }],
        },
      ),
      row(
        'r5',
        {
          id: 'size',
          type: 'radio',
          key: 'size',
          label: 'Size',
          options: [{ label: 'S', value: 's' }],
          defaultValue: 's',
        },
        {
          id: 'team',
          type: 'select',
          key: 'team',
          label: 'Team',
          searchable: true,
          options: [{ label: 'QA', value: 'qa' }],
        },
      ),
      row(
        'r6',
        { id: 'labels', type: 'taglist', key: 'labels', label: 'Labels' },
        { id: 'owner', type: 'select', key: 'owner', label: 'Owner', valuesKey: 'users', defaultValue: 'ana' },
      ),
      row(
        'r7',
        { id: 'intro', type: 'textview', text: 'Hello {{ title }}' },
        { id: 'gap', type: 'spacer', height: 40 },
      ),
      row('r8', { id: 'line', type: 'separator' }),
      row(
        'r9',
        { id: 'starts', type: 'time', key: 'starts', label: 'Starts at', use24h: false, timeInterval: 30 },
        { id: 'files', type: 'filepicker', key: 'files', label: 'Files', accept: '.pdf,image/*', multiple: true },
      ),
      row(
        'r10',
        { id: 'logo', type: 'image', source: 'https://example.com/logo.png', alt: 'Logo' },
        { id: 'info', type: 'html', content: '<p>Hello {{ title }}</p>' },
      ),
      row('r11', {
        id: 'items',
        type: 'table',
        label: 'Items',
        dataSource: '=lineItems',
        rowCount: 10,
        columns: [{ label: 'Name', key: 'name' }],
      }),
      row(
        'r12',
        { id: 'docs', type: 'documentPreview', label: 'Docs', dataSource: '=documents', maxHeight: 400 },
        {
          id: 'site',
          type: 'iframe',
          label: 'Site',
          url: 'https://example.com',
          height: 300,
          security: { allowScripts: true, fullscreen: false },
        },
      ),
      row(
        'r13',
        {
          id: 'total',
          type: 'expression',
          key: 'total',
          expression: '=estimate * 2',
          computeOn: 'presubmit',
        },
        text('hidden', {
          readOnly: '=billable',
          conditional: { hide: '=not(billable)' },
          layout: { columns: 8 },
          properties: { 'data-test': 'hidden' },
        }),
      ),
      row('r14', { ...clientGroup, verticalAlignment: 'center' }, { ...checklistList }),
      row(
        'r15',
        { id: 'submit', type: 'button', label: 'Submit', action: 'submit' },
        { id: 'reset', type: 'button', label: 'Reset', action: 'reset' },
      ),
    ];

    expect(messagesOf(rows, { versionTag: ' v1.2 ' })).toEqual([]);
    expect(updateFormSettingsSchema.parse({ rows: [], versionTag: ' v1.2 ' }).versionTag).toBe('v1.2');
  });

  it('rejects more than two fields in a row and empty rows', () => {
    expect(messagesOf([row('r1', text('a'), text('b'), text('c'))])).toEqual([
      'rows.0.fields: A row can contain at most 2 fields',
    ]);
    expect(messagesOf([row('r1')])).toEqual(['rows.0.fields: A row must contain at least one field']);
  });

  it('requires key and label on data components, label and action on buttons', () => {
    expect(messagesOf([row('r1', { id: 'a', type: 'text' }, { id: 'b', type: 'button' })])).toEqual([
      'rows.0.fields.0.key: Key is required',
      'rows.0.fields.0.label: Label is required',
      'rows.0.fields.1.label: Label is required',
      'rows.0.fields.1.action: Action is required (submit or reset)',
    ]);
  });

  it('requires options on select, radio and checkbox group (but not on tag list)', () => {
    const messages = messagesOf([
      row('r1', { id: 'a', type: 'select', key: 'a', label: 'A', options: [] }),
      row('r2', { id: 'b', type: 'taglist', key: 'b', label: 'B' }),
    ]);
    expect(messages).toEqual(['rows.0.fields.0.options: Add at least one option']);
  });

  it('accepts only one options source', () => {
    expect(
      messagesOf([
        row('r1', {
          id: 'a',
          type: 'select',
          key: 'a',
          label: 'A',
          options: [{ label: 'X', value: 'x' }],
          valuesKey: 'items',
        }),
        row('r2', { id: 'b', type: 'checklist', key: 'b', label: 'B', valuesExpression: '=items' }),
      ]),
    ).toEqual([
      'rows.0.fields.0.options: Use only one options source: static options, input data (valuesKey) or an expression',
    ]);
  });

  it('rejects duplicate option values, keys, field ids and row ids', () => {
    const messages = messagesOf([
      row('r1', {
        id: 'a',
        type: 'select',
        key: 'a',
        label: 'A',
        options: [
          { label: 'One', value: 'x' },
          { label: 'Two', value: 'x' },
        ],
      }),
      row('r1', text('b', { key: 'a' })),
      row('r3', text('b')),
    ]);

    expect(messages).toEqual(
      expect.arrayContaining([
        'rows.0.fields.0.options.1.value: Duplicate option value "x"',
        'rows.1.id: Duplicate row id "r1"',
        'rows.1.fields.0.key: Duplicate key "a"',
        'rows.2.fields.0.id: Duplicate field id "b"',
      ]),
    );
  });

  it('restricts the component type of core task keys', () => {
    expect(messagesOf([row('r1', { id: 'a', type: 'checkbox', key: 'status', label: 'Done' })])).toEqual([
      'rows.0.fields.0.type: Key "status" can only be used by: select, radio',
    ]);
  });

  it('requires static options for status and priority', () => {
    expect(
      messagesOf([
        row('r1', { id: 'a', type: 'select', key: 'status', label: 'Status', valuesKey: 'statuses' }),
        row('r2', { id: 'b', type: 'radio', key: 'priority', label: 'Priority', valuesExpression: '=levels' }),
      ]),
    ).toEqual([
      'rows.0.fields.0.valuesKey: Key "status" must use static options',
      'rows.1.fields.0.valuesExpression: Key "priority" must use static options',
    ]);
  });

  it('validates default values against the component', () => {
    expect(
      messagesOf([
        row('r1', {
          id: 'a',
          type: 'select',
          key: 'a',
          label: 'A',
          options: [{ label: 'X', value: 'x' }],
          defaultValue: 'y',
        }),
        row('r2', { id: 'b', type: 'number', key: 'b', label: 'B', defaultValue: 'ten' }),
        row('r3', { id: 'c', type: 'time', key: 'c', label: 'C', defaultValue: '25:00' }),
        row('r4', { ...summaryExpression, defaultValue: 'not checked' }),
      ]),
    ).toEqual([
      'rows.0.fields.0.defaultValue: Default value: Must be one of: x',
      'rows.1.fields.0.defaultValue: Default value: Must be a number',
      'rows.2.fields.0.defaultValue: Default value: Must be a valid time (HH:mm, 24-hour)',
    ]);
  });

  it('validates the validation rules', () => {
    expect(
      messagesOf([
        row('r1', text('a', { validation: { minLength: 10, maxLength: 5 } })),
        row('r2', text('b', { validation: { pattern: 'custom' } })),
        row('r3', text('c', { validation: { pattern: 'custom', customPattern: '(' } })),
        row('r4', { id: 'd', type: 'number', key: 'd', label: 'D', validation: { min: 5, max: 1 } }),
      ]),
    ).toEqual([
      'rows.0.fields.0.validation.minLength: Minimum length must not exceed maximum length',
      'rows.1.fields.0.validation.customPattern: Custom regular expression is required',
      'rows.2.fields.0.validation.customPattern: Invalid regular expression',
      'rows.3.fields.0.validation.min: Minimum must not exceed maximum',
    ]);
  });

  it('rejects regular expressions prone to catastrophic backtracking (ReDoS)', () => {
    expect(messagesOf([row('r1', text('a', { validation: { pattern: 'custom', customPattern: '(a+)+$' } }))])).toEqual([
      'rows.0.fields.0.validation.customPattern: Regular expression is too complex',
    ]);
    expect(
      messagesOf([row('r1', text('a', { validation: { pattern: 'custom', customPattern: 'C-[0-9]{3}' } }))]),
    ).toEqual([]);
  });

  it('rejects unknown properties and component types', () => {
    expect(messagesOf([row('r1', text('a', { color: 'red' }))])).toEqual([
      'rows.0.fields.0: Unrecognized key: "color"',
    ]);
    expect(messagesOf([row('r1', { id: 'a', type: 'signature', key: 'a', label: 'A' })])[0]).toMatch(
      /rows.0.fields.0.type: Type must be one of/,
    );
    expect(messagesOf([row('r1', text('a', { conditional: { show: '=x' } }))])).toEqual([
      'rows.0.fields.0.conditional: Unrecognized key: "show"',
    ]);
  });

  describe('FEEL properties (shape only)', () => {
    it.each([
      [
        'conditional.hide',
        { conditional: { hide: 'x > 1' } },
        'conditional.hide: Must be a FEEL expression starting with "="',
      ],
      ['readOnly', { readOnly: '=  ' }, 'readOnly: Expression must not be empty'],
      [
        'too long',
        { conditional: { hide: `=${'x'.repeat(500)}` } },
        'conditional.hide: Expression must be at most 500 characters',
      ],
    ])('%s', (_name, overrides, message) => {
      expect(messagesOf([row('r1', text('a', overrides))])).toEqual([`rows.0.fields.0.${message}`]);
    });

    it('still reports the errors of the component tree', () => {
      expect(
        messagesOf([row('r1', text('a', { conditional: { hide: 'x' } })), row('r2', text('b', { key: 'a' }))]),
      ).toEqual([
        'rows.0.fields.0.conditional.hide: Must be a FEEL expression starting with "="',
        'rows.1.fields.0.key: Duplicate key "a"',
      ]);
    });

    it('accepts FEEL and templates in text properties', () => {
      expect(messagesOf([row('r1', text('a', { label: '=upper(title)', description: 'Hi {{ name }}' }))])).toEqual([]);
    });

    it('requires the key and the expression of an expression component', () => {
      expect(messagesOf([row('r1', { id: 'x', type: 'expression', computeOn: 'later' })])).toEqual([
        'rows.0.fields.0.computeOn: Compute on must be one of: change, presubmit',
      ]);
      expect(messagesOf([row('r1', { id: 'x', type: 'expression' })])).toEqual([
        'rows.0.fields.0.key: Key is required',
        'rows.0.fields.0.expression: Expression is required',
      ]);
    });
  });

  describe('presentation and container components', () => {
    it('validates tables', () => {
      expect(messagesOf([row('r1', { id: 't', type: 'table' })])).toEqual([
        'rows.0.fields.0.dataSource: Data source is required',
        'rows.0.fields.0.columns: Add at least one column or a columns expression',
      ]);
      expect(
        messagesOf([
          row('r1', {
            id: 't',
            type: 'table',
            dataSource: '=rows',
            columnsExpression: '=headers',
            columns: [
              { label: 'A', key: 'a' },
              { label: 'B', key: 'a' },
            ],
          }),
          row('r2', { id: 'u', type: 'table', dataSource: '=rows', columnsExpression: '=headers', rowCount: 0 }),
        ]),
      ).toEqual([
        'rows.1.fields.0.rowCount: Must be between 1 and 100',
        'rows.0.fields.0.columns: Use either static columns or a columns expression, not both',
        'rows.0.fields.0.columns.1.key: Duplicate column key "a"',
      ]);
    });

    it('validates document previews, images and iframes', () => {
      expect(
        messagesOf([
          row('r1', { id: 'd', type: 'documentPreview' }),
          row('r2', { id: 'i', type: 'image', source: 'javascript:alert(1)' }, { id: 'j', type: 'image', source: '' }),
          row('r3', { id: 'f', type: 'iframe', url: 'http://example.com', height: 20 }),
          row('r4', { id: 'g', type: 'iframe', url: '=site', security: { allowEverything: true } }),
          row('r5', { id: 's', type: 'spacer', height: 500 }),
        ]),
      ).toEqual([
        'rows.3.fields.0.security: Unrecognized key: "allowEverything"',
        'rows.0.fields.0.dataSource: Data source is required',
        'rows.1.fields.0.source: Source must be an http(s) URL, a data:image URI or a FEEL expression',
        'rows.2.fields.0.url: URL must use https or be a FEEL expression',
        'rows.2.fields.0.height: Must be between 50 and 2000',
        'rows.4.fields.0.height: Must be between 8 and 400',
      ]);
    });

    it('limits text view and HTML content', () => {
      expect(
        messagesOf([
          row('r1', { id: 't', type: 'textview', text: 'x'.repeat(5001) }),
          row('r2', { id: 'h', type: 'html', content: 'x'.repeat(10_001) }),
        ]),
      ).toEqual([
        'rows.0.fields.0.text: Text must be at most 5000 characters',
        'rows.1.fields.0.content: Content must be at most 10000 characters',
      ]);
    });

    it('validates dynamic list and group properties', () => {
      expect(
        messagesOf([
          row('r1', list('items', [], { defaultRepetitions: 51, nonCollapsedItems: 0, verticalAlignment: 'top' })),
        ]),
      ).toEqual([
        'rows.0.fields.0.verticalAlignment: Vertical alignment must be one of: start, center, end',
        'rows.0.fields.0.defaultRepetitions: Must be between 0 and 50',
        'rows.0.fields.0.nonCollapsedItems: Must be between 1 and 50',
      ]);
    });

    it('allows rows on groups and dynamic lists only, and requires them there', () => {
      expect(
        messagesOf([
          row('r1', text('a', { rows: [] })),
          row('r2', { id: 'g', type: 'group' }, { id: 'l', type: 'dynamiclist' }),
        ]),
      ).toEqual([
        'rows.0.fields.0.rows: Only groups and dynamic lists can contain rows',
        'rows.1.fields.0.rows: Rows are required (the list may be empty)',
        'rows.1.fields.1.rows: Rows are required (the list may be empty)',
        'rows.1.fields.1.path: Path is required',
      ]);
    });

    it('validates file pickers, time components and custom properties', () => {
      expect(
        messagesOf([
          row('r1', { id: 'f', type: 'filepicker', key: 'f', label: 'F', accept: 'x'.repeat(201), multiple: 'yes' }),
          row('r2', { id: 't', type: 'time', key: 't', label: 'T', timeInterval: 7, use24h: 1 }),
        ]),
      ).toEqual([
        'rows.0.fields.0.accept: Supported formats must be at most 200 characters',
        'rows.0.fields.0.multiple: Invalid input: expected boolean, received string',
        'rows.1.fields.0.use24h: Invalid input: expected boolean, received number',
        'rows.1.fields.0.timeInterval: Time interval must be one of: 1, 5, 10, 15, 30, 60',
      ]);

      const tooMany = Object.fromEntries(Array.from({ length: 51 }, (_, index) => [`p${index}`, 'v']));
      expect(
        messagesOf([
          row('r1', text('a', { properties: tooMany })),
          row('r2', text('b', { properties: { '': 'v', ok: 'x'.repeat(501) } })),
        ]),
      ).toEqual([
        'rows.0.fields.0.properties: At most 50 custom properties',
        'rows.1.fields.0.properties.ok: Value must be at most 500 characters',
        'rows.1.fields.0.properties.: Property name must be 1-100 characters',
      ]);
    });
  });

  describe('layout', () => {
    it('limits the columns of a row to the 16-column grid', () => {
      expect(
        messagesOf([
          row('r1', text('a', { layout: { columns: 8 } }), text('b', { layout: { columns: 8 } })),
          row('r2', text('c', { layout: { columns: 14 } }), text('d')),
          row('r3', text('e', { layout: { columns: 16 } }), text('f')),
        ]),
      ).toEqual(['rows.2.fields: Columns exceed the maximum of 16 per row']);
    });

    it('accepts 2 to 16 columns per component', () => {
      expect(messagesOf([row('r1', text('a', { layout: { columns: 1 } }))])).toEqual([
        'rows.0.fields.0.layout.columns: Must be between 2 and 16',
      ]);
    });
  });

  describe('scopes and nesting', () => {
    it('checks keys per scope: a group without path shares its parent scope, a path opens a new one', () => {
      expect(
        messagesOf([
          row('r1', text('name'), group('g1', [row('g1r1', text('name2', { key: 'name' }))])),
          row('r2', group('g2', [row('g2r1', text('name3', { key: 'name' }))], { path: 'client' })),
          row('r3', list('items', [row('l1r1', text('name4', { key: 'name' }))])),
        ]),
      ).toEqual(['rows.0.fields.1.rows.0.fields.0.key: Duplicate key "name"']);
    });

    it('counts a container path as a key of its parent scope', () => {
      expect(
        messagesOf([
          row('r1', text('client'), group('g', [], { path: 'client' })),
          row('r2', list('l', [], { path: 'client' })),
        ]),
      ).toEqual(['rows.0.fields.1.path: Duplicate key "client"', 'rows.1.fields.0.path: Duplicate key "client"']);
    });

    it('keeps ids unique across the whole document', () => {
      expect(messagesOf([row('r1', text('a')), row('r2', group('g', [row('r1', text('a', { key: 'b' }))]))])).toEqual([
        'rows.1.fields.0.rows.0.id: Duplicate row id "r1"',
        'rows.1.fields.0.rows.0.fields.0.id: Duplicate field id "a"',
      ]);
    });

    it('allows core keys in the root scope only (a group without path is still the root scope)', () => {
      expect(
        messagesOf([
          row('r1', group('g1', [row('g1r1', text('t', { key: 'title' }))])),
          row('r2', group('g2', [row('g2r1', text('d', { key: 'description' }))], { path: 'client' })),
          row(
            'r3',
            list('items', [
              row('l1r1', {
                id: 's',
                type: 'select',
                key: 'status',
                label: 'S',
                options: [{ label: 'A', value: 'a' }],
              }),
            ]),
          ),
          row('r4', group('g4', [], { path: 'tags' })),
        ]),
      ).toEqual([
        'rows.1.fields.0.rows.0.fields.0.key: Key "description" is bound to the task and cannot be used inside a group with a path or a dynamic list',
        'rows.2.fields.0.rows.0.fields.0.key: Key "status" is bound to the task and cannot be used inside a group with a path or a dynamic list',
        'rows.3.fields.0.type: Key "tags" can only be used by: taglist, checklist',
      ]);
    });

    it('limits the nesting depth of containers to 3 levels', () => {
      const level4 = group('g4', [row('r4', text('deep'))]);
      const level3 = list('l3', [row('r3', level4)]);
      const level2 = group('g2', [row('r2', level3)], { path: 'p2' });
      expect(messagesOf([row('r1', group('g1', [row('r1b', level2)]))])).toEqual([
        'rows.0.fields.0.rows.0.fields.0.rows.0.fields.0.rows.0.fields.0: Containers can be nested at most 3 levels deep',
      ]);
      expect(messagesOf([row('r1', level2)])).toEqual([]);
    });

    it('limits the number of components of the whole form', () => {
      const rows = Array.from({ length: 251 }, (_, index) => row(`r${index}`, text(`a${index}`), text(`b${index}`)));
      expect(messagesOf(rows)).toEqual(['rows: A form can contain at most 500 components']);
    });
  });

  it('limits the version tag', () => {
    expect(messagesOf([], { versionTag: 'x'.repeat(51) })).toEqual([
      'versionTag: Version tag must be at most 50 characters',
    ]);
  });
});
