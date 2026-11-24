import type { FormField } from '../../../src/models/form-settings.model';
import { checkFieldValue, isEmptyValue, normalizeFieldValue } from '../../../src/validators/field-value.rules';
import { sampleFile } from '../../helpers/form-fixtures';

const NOW = new Date('2026-11-23T10:00:00.000Z');
const field = (overrides: Partial<FormField>): FormField => ({
  id: 'f',
  key: 'f',
  label: 'F',
  type: 'text',
  ...overrides,
});
const options = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
];

describe('checkFieldValue', () => {
  it.each<[string, Partial<FormField>, unknown, string | null]>([
    ['text ok', {}, 'hello', null],
    ['text too long (settings)', { validation: { maxLength: 3 } }, 'hello', 'Must be at most 3 characters'],
    ['text too short', { validation: { minLength: 6 } }, 'hello', 'Must be at least 6 characters'],
    ['text hard limit', {}, 'x'.repeat(1001), 'Must be at most 1000 characters'],
    ['text email pattern', { validation: { pattern: 'email' } }, 'nope', 'Must be a valid email address'],
    ['text phone pattern', { validation: { pattern: 'phone' } }, '+62 812-3456', null],
    ['text custom pattern ok', { validation: { pattern: 'custom', customPattern: 'C-[0-9]{3}' } }, 'C-123', null],
    [
      'text custom pattern is anchored',
      { validation: { pattern: 'custom', customPattern: 'C-[0-9]{3}' } },
      'xC-1234',
      'Does not match the required format',
    ],
    ['textarea wrong type', { type: 'textarea' }, 5, 'Must be text'],
    ['email', { type: 'email' }, 'qa@example.com', null],
    ['email invalid', { type: 'email' }, 'qa@', 'Must be a valid email address'],
    ['number ok', { type: 'number', validation: { min: 1, max: 5 } }, 3, null],
    ['number below min', { type: 'number', validation: { min: 1 } }, 0, 'Must be at least 1'],
    ['number above max', { type: 'number', validation: { max: 5 } }, 6, 'Must be at most 5'],
    ['number decimals', { type: 'number', decimalDigits: 1 }, 1.25, 'Must have at most 1 decimal digit(s)'],
    ['number decimals float tolerance', { type: 'number', decimalDigits: 1 }, 1.1, null],
    ['number wrong type', { type: 'number' }, '3', 'Must be a number'],
    ['date', { type: 'date' }, '2026-12-31', null],
    ['date invalid', { type: 'date' }, '2026-02-30', 'Must be a valid date (YYYY-MM-DD)'],
    ['date in the past', { type: 'date', disallowPastDates: true }, '2026-11-01', 'Must not be in the past'],
    ['date today is allowed', { type: 'date', disallowPastDates: true }, '2026-11-23', null],
    ['time', { type: 'time' }, '23:59', null],
    ['time invalid', { type: 'time' }, '24:00', 'Must be a valid time (HH:mm, 24-hour)'],
    ['time wrong type', { type: 'time' }, 930, 'Must be a valid time (HH:mm, 24-hour)'],
    ['datetime', { type: 'datetime' }, '2026-12-01T09:00:00.000Z', null],
    ['datetime invalid', { type: 'datetime' }, 'tomorrow', 'Must be a valid ISO 8601 date-time'],
    [
      'datetime in the past',
      { type: 'datetime', disallowPastDates: true },
      '2026-11-01T00:00:00Z',
      'Must not be in the past',
    ],
    ['checkbox', { type: 'checkbox' }, false, null],
    ['checkbox wrong type', { type: 'checkbox' }, 'yes', 'Must be true or false'],
    ['select ok', { type: 'select', options }, 'two', null],
    ['select unknown option', { type: 'select', options }, 'three', 'Must be one of: one, two'],
    ['select wrong type', { type: 'select', options }, 2, 'Must be one of the options'],
    ['select with input data options', { type: 'select', valuesKey: 'users' }, 'anyone', null],
    ['radio unknown option', { type: 'radio', options }, 'x', 'Must be one of: one, two'],
    ['checklist ok', { type: 'checklist', options }, ['one', 'two'], null],
    ['checklist unknown option', { type: 'checklist', options }, ['one', 'zzz'], 'Unknown option(s): zzz'],
    ['checklist with expression options', { type: 'checklist', valuesExpression: '=items' }, ['zzz'], null],
    ['checklist wrong type', { type: 'checklist', options }, [1], 'Must be a list of values'],
    ['taglist with options', { type: 'taglist', options }, ['zzz'], 'Unknown option(s): zzz'],
    ['taglist free-form', { type: 'taglist' }, ['anything'], null],
    ['taglist free-form too long', { type: 'taglist' }, ['x'.repeat(51)], 'Each tag must be 1-50 characters'],
    [
      'list too long',
      { type: 'taglist' },
      Array.from({ length: 21 }, (_, i) => `t${i}`),
      'Must contain at most 20 values',
    ],
    ['file picker ok', { type: 'filepicker' }, [sampleFile], null],
    ['file picker multiple', { type: 'filepicker', multiple: true }, [sampleFile, sampleFile], null],
    ['file picker single', { type: 'filepicker' }, [sampleFile, sampleFile], 'Must contain at most 1 file(s)'],
    [
      'file picker too many',
      { type: 'filepicker', multiple: true },
      Array.from({ length: 11 }, () => sampleFile),
      'Must contain at most 10 file(s)',
    ],
    ['file picker wrong type', { type: 'filepicker' }, sampleFile, 'Must be a list of uploaded files'],
    [
      'file picker invalid reference',
      { type: 'filepicker' },
      [{ ...sampleFile, size: -1 }],
      'Each file must be a reference returned by the upload ({ id, name, size, contentType })',
    ],
    ['expression (any JSON)', { type: 'expression' }, { nested: [1, 'a'] }, null],
    ['presentation component', { type: 'textview' }, 'x', 'This component does not hold a value'],
  ])('%s', (_name, overrides, value, expected) => {
    expect(checkFieldValue(field(overrides), value as never, { now: NOW })).toBe(expected);
  });

  it('skips date constraints when asked (default values / unchanged values)', () => {
    expect(
      checkFieldValue(field({ type: 'date', disallowPastDates: true }), '2020-01-01', {
        now: NOW,
        skipConstraints: true,
      }),
    ).toBeNull();
  });
});

describe('value helpers', () => {
  it('detects empty values', () => {
    expect([undefined, null, '', '  ', [], {}].every((value) => isEmptyValue(value))).toBe(true);
    expect([false, 0, 'x', ['a'], { a: 1 }].some((value) => isEmptyValue(value))).toBe(false);
  });

  it('normalizes strings and lists of strings', () => {
    expect(normalizeFieldValue('  x ')).toBe('x');
    expect(normalizeFieldValue([' a', 'a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeFieldValue(3)).toBe(3);
    expect(normalizeFieldValue([sampleFile])).toEqual([sampleFile]);
  });
});
