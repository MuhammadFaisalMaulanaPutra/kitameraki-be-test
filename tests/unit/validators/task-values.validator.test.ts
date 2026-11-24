import type { FormField } from '../../../src/models/form-settings.model';
import type { Task } from '../../../src/models/task.model';
import { ValidationError } from '../../../src/utils/errors';
import { extractTaskValues, validateTaskValues } from '../../../src/validators/task-values.validator';
import {
  attachmentsField,
  checklistList,
  clientGroup,
  rowsOf,
  sampleFile,
  severityField,
  summaryExpression,
  templateWithCustomRows,
} from '../../helpers/form-fixtures';

const NOW = new Date('2026-11-23T10:00:00.000Z');
const billable: FormField = { id: 'f_billable', type: 'checkbox', key: 'billable', label: 'Billable', required: true };

function detailsOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationError) return error.details;
    throw error;
  }
  throw new Error('Expected a ValidationError');
}

describe('extractTaskValues', () => {
  it('flattens core properties and custom fields into one map', () => {
    expect(extractTaskValues({ title: 'x', status: null, customFields: { severity: 'minor' } })).toEqual({
      title: 'x',
      status: null,
      severity: 'minor',
    });
  });
});

describe('validateTaskValues', () => {
  const rows = templateWithCustomRows([severityField]);

  it('applies default values on create only', () => {
    expect(validateTaskValues(rows, { title: 'x' }, { mode: 'create', now: NOW })).toEqual({
      title: 'x',
      status: 'todo',
    });
    expect(() => validateTaskValues(rows, { title: 'x' }, { mode: 'replace', now: NOW })).toThrow(ValidationError);
  });

  it('clears omitted optional values on replace', () => {
    expect(validateTaskValues(rows, { title: 'x', status: 'todo' }, { mode: 'replace', now: NOW })).toEqual({
      title: 'x',
      description: null,
      dueDate: null,
      priority: null,
      status: 'todo',
      tags: null,
      severity: null,
    });
  });

  it('only touches provided keys on patch', () => {
    expect(validateTaskValues(rows, { severity: 'major' }, { mode: 'patch', now: NOW })).toEqual({
      severity: 'major',
    });
  });

  it('reports every problem at once', () => {
    expect(
      detailsOf(() =>
        validateTaskValues(rows, { title: '', priority: 'urgent', ghost: 1 }, { mode: 'create', now: NOW }),
      ),
    ).toEqual([
      { field: 'customFields.ghost', message: 'Field is not part of the task form' },
      { field: 'title', message: 'Title is required' },
      { field: 'priority', message: 'Priority: Must be one of: low, medium, high' },
    ]);
  });

  it('requires a required checkbox to be checked', () => {
    expect(
      detailsOf(() => validateTaskValues(rowsOf(billable), { billable: false }, { mode: 'create', now: NOW })),
    ).toEqual([{ field: 'customFields.billable', message: 'Billable must be checked' }]);
    expect(validateTaskValues(rowsOf(billable), { billable: true }, { mode: 'create', now: NOW })).toEqual({
      billable: true,
    });
  });

  it('ignores presentation, button and iframe components', () => {
    const components: FormField[] = [
      { id: 'intro', type: 'textview', text: 'Hello' },
      { id: 'submit', type: 'button', label: 'Submit', action: 'submit' },
      { id: 'site', type: 'iframe', url: 'https://example.com' },
    ];
    expect(validateTaskValues(rowsOf(...components), {}, { mode: 'replace', now: NOW })).toEqual({});
  });

  it('skips "disallow past dates" for a value that did not change', () => {
    const due: FormField = { id: 'due', type: 'datetime', key: 'dueDate', label: 'Due', disallowPastDates: true };
    const existing = { dueDate: '2020-01-01T00:00:00.000Z', tags: [], customFields: {} } as unknown as Task;

    expect(
      validateTaskValues(rowsOf(due), { dueDate: '2020-01-01T00:00:00.000Z' }, { mode: 'patch', existing, now: NOW }),
    ).toEqual({
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    expect(
      detailsOf(() =>
        validateTaskValues(rowsOf(due), { dueDate: '2020-02-01T00:00:00.000Z' }, { mode: 'patch', existing, now: NOW }),
      ),
    ).toEqual([{ field: 'dueDate', message: 'Due: Must not be in the past' }]);
  });

  describe('expression, time and file picker values', () => {
    it('stores any JSON value of an expression and never requires it', () => {
      const form = rowsOf({ ...summaryExpression, required: true } as FormField);
      expect(validateTaskValues(form, {}, { mode: 'create', now: NOW })).toEqual({});
      expect(validateTaskValues(form, {}, { mode: 'replace', now: NOW })).toEqual({ summary: null });
      expect(validateTaskValues(form, { summary: { total: 3, items: ['a'] } }, { mode: 'create', now: NOW })).toEqual({
        summary: { total: 3, items: ['a'] },
      });
    });

    it('validates time values', () => {
      const time: FormField = { id: 'starts', type: 'time', key: 'starts', label: 'Starts' };
      expect(validateTaskValues(rowsOf(time), { starts: '09:30' }, { mode: 'create', now: NOW })).toEqual({
        starts: '09:30',
      });
      expect(
        detailsOf(() => validateTaskValues(rowsOf(time), { starts: '9:30' }, { mode: 'create', now: NOW })),
      ).toEqual([{ field: 'customFields.starts', message: 'Starts: Must be a valid time (HH:mm, 24-hour)' }]);
    });

    it('validates file references and the number of files', () => {
      const single: FormField = { ...attachmentsField, multiple: false, required: true };
      expect(validateTaskValues(rowsOf(single), { attachments: [sampleFile] }, { mode: 'create', now: NOW })).toEqual({
        attachments: [sampleFile],
      });
      expect(
        detailsOf(() =>
          validateTaskValues(rowsOf(single), { attachments: [sampleFile, sampleFile] }, { mode: 'create', now: NOW }),
        ),
      ).toEqual([{ field: 'customFields.attachments', message: 'Attachments: Must contain at most 1 file(s)' }]);
      expect(
        detailsOf(() => validateTaskValues(rowsOf(single), { attachments: [] }, { mode: 'create', now: NOW })),
      ).toEqual([{ field: 'customFields.attachments', message: 'Attachments is required' }]);
      expect(
        detailsOf(() =>
          validateTaskValues(
            rowsOf(attachmentsField),
            { attachments: [{ id: 'x', name: 'a' }] },
            { mode: 'create', now: NOW },
          ),
        ),
      ).toEqual([
        {
          field: 'customFields.attachments',
          message:
            'Attachments: Each file must be a reference returned by the upload ({ id, name, size, contentType })',
        },
      ]);
    });
  });

  describe('groups with a path', () => {
    const form = rowsOf(clientGroup);

    it('validates the nested object, applies nested defaults on create and drops empty values', () => {
      expect(
        validateTaskValues(form, { client: { name: ' Acme ', tier: null } }, { mode: 'create', now: NOW }),
      ).toEqual({ client: { name: 'Acme' } });
      expect(validateTaskValues(form, { client: { name: 'Acme' } }, { mode: 'create', now: NOW })).toEqual({
        client: { name: 'Acme', tier: 'standard' },
      });
    });

    it('requires the required children even when the group value is missing', () => {
      expect(detailsOf(() => validateTaskValues(form, {}, { mode: 'replace', now: NOW }))).toEqual([
        { field: 'customFields.client.name', message: 'Client name is required' },
      ]);
    });

    it('rejects non-object values and unknown nested keys', () => {
      expect(detailsOf(() => validateTaskValues(form, { client: ['Acme'] }, { mode: 'create', now: NOW }))).toEqual([
        { field: 'customFields.client', message: 'Client: Must be an object' },
      ]);
      expect(
        detailsOf(() =>
          validateTaskValues(
            form,
            { client: { name: 'Acme', tier: 'silver', vat: 'x' } },
            { mode: 'create', now: NOW },
          ),
        ),
      ).toEqual([
        { field: 'customFields.client.vat', message: 'Field is not part of the task form' },
        { field: 'customFields.client.tier', message: 'Tier: Must be one of: standard, gold' },
      ]);
    });

    it('clears the group on replace when every child is empty', () => {
      const optional = rowsOf({
        ...clientGroup,
        rows: [{ id: 'r', fields: [{ id: 'n', type: 'text', key: 'name', label: 'Name' }] }],
      });
      expect(validateTaskValues(optional, { client: { name: '' } }, { mode: 'replace', now: NOW })).toEqual({
        client: null,
      });
      expect(validateTaskValues(optional, {}, { mode: 'create', now: NOW })).toEqual({});
    });

    it('treats a group without path as part of the current scope', () => {
      const transparent: FormField = {
        id: 'g',
        type: 'group',
        label: 'Details',
        rows: rowsOf(severityField),
      };
      expect(validateTaskValues(rowsOf(transparent), { severity: 'minor' }, { mode: 'create', now: NOW })).toEqual({
        severity: 'minor',
      });
    });

    it('validates a provided nested value completely on patch', () => {
      expect(
        detailsOf(() => validateTaskValues(form, { client: { tier: 'gold' } }, { mode: 'patch', now: NOW })),
      ).toEqual([{ field: 'customFields.client.name', message: 'Client name is required' }]);
      expect(validateTaskValues(form, { client: { name: 'Acme' } }, { mode: 'patch', now: NOW })).toEqual({
        client: { name: 'Acme' },
      });
    });
  });

  describe('dynamic lists', () => {
    const form = rowsOf(checklistList);

    it('validates every item as a nested scope (no default values)', () => {
      expect(
        validateTaskValues(
          form,
          {
            checklist: [
              { item: 'Slides', done: true },
              { item: ' Demo ', done: null },
            ],
          },
          { mode: 'create', now: NOW },
        ),
      ).toEqual({ checklist: [{ item: 'Slides', done: true }, { item: 'Demo' }] });
    });

    it('reports item errors with their index', () => {
      expect(
        detailsOf(() =>
          validateTaskValues(
            form,
            { checklist: [{ item: 'Slides' }, { done: 'yes' }, 'x'] },
            { mode: 'create', now: NOW },
          ),
        ),
      ).toEqual([
        { field: 'customFields.checklist.1.item', message: 'Item is required' },
        { field: 'customFields.checklist.1.done', message: 'Done: Must be true or false' },
        { field: 'customFields.checklist.2', message: 'Checklist item 3: Must be an object' },
      ]);
    });

    it('accepts a missing or empty list and rejects non-lists and long lists', () => {
      expect(validateTaskValues(form, {}, { mode: 'create', now: NOW })).toEqual({});
      expect(validateTaskValues(form, { checklist: [] }, { mode: 'replace', now: NOW })).toEqual({ checklist: null });
      expect(validateTaskValues(form, { checklist: null }, { mode: 'replace', now: NOW })).toEqual({ checklist: null });
      expect(
        detailsOf(() => validateTaskValues(form, { checklist: { item: 'x' } }, { mode: 'create', now: NOW })),
      ).toEqual([{ field: 'customFields.checklist', message: 'Checklist: Must be a list' }]);
      const tooMany = Array.from({ length: 51 }, () => ({ item: 'x' }));
      expect(detailsOf(() => validateTaskValues(form, { checklist: tooMany }, { mode: 'create', now: NOW }))).toEqual([
        { field: 'customFields.checklist', message: 'Checklist: Must contain at most 50 items' },
      ]);
    });

    it('compares nested values with the stored item to skip past-date checks', () => {
      const deadlines: FormField = {
        id: 'l',
        type: 'dynamiclist',
        path: 'milestones',
        label: 'Milestones',
        rows: rowsOf({ id: 'd', type: 'date', key: 'due', label: 'Due', disallowPastDates: true }),
      };
      const existing = { tags: [], customFields: { milestones: [{ due: '2020-01-01' }] } } as unknown as Task;
      expect(
        validateTaskValues(
          rowsOf(deadlines),
          { milestones: [{ due: '2020-01-01' }] },
          { mode: 'replace', existing, now: NOW },
        ),
      ).toEqual({ milestones: [{ due: '2020-01-01' }] });
      expect(
        detailsOf(() =>
          validateTaskValues(
            rowsOf(deadlines),
            { milestones: [{ due: '2020-01-02' }] },
            { mode: 'replace', existing, now: NOW },
          ),
        ),
      ).toEqual([{ field: 'customFields.milestones.0.due', message: 'Due: Must not be in the past' }]);
    });
  });

  describe('conditionally hidden components', () => {
    it('skips the required check for a hidden component or a component inside a hidden container', () => {
      const hiddenField: FormField = { ...billable, conditional: { hide: '=not(isBillable)' } };
      const hiddenList: FormField = { ...checklistList, conditional: { hide: '=true' } };
      const hiddenGroup: FormField = { ...clientGroup, conditional: { hide: '=true' } };

      expect(
        validateTaskValues(
          rowsOf(hiddenField, hiddenList, hiddenGroup),
          { checklist: [{ done: true }] },
          { mode: 'replace', now: NOW },
        ),
      ).toEqual({ billable: null, checklist: [{ done: true }], client: null });
    });

    it('still checks the format of a value that is present', () => {
      const hidden: FormField = { ...severityField, required: true, conditional: { hide: '=true' } };
      expect(
        detailsOf(() => validateTaskValues(rowsOf(hidden), { severity: 'x' }, { mode: 'create', now: NOW })),
      ).toEqual([{ field: 'customFields.severity', message: 'Severity: Must be one of: minor, major' }]);
    });
  });
});
