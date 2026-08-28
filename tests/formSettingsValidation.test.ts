import assert from 'node:assert/strict';
import test from 'node:test';
import { SYSTEM_FORM_FIELDS } from '../src/domain/formSettings';
import { ValidationError } from '../src/errors/AppError';
import { parseFormSettingsBody } from '../src/validation/formSettingsValidation';

function baseFields() {
  return SYSTEM_FORM_FIELDS.map((field) => ({ ...field }));
}

test('form settings allow system-field label rename and custom email field', () => {
  const fields = baseFields();
  fields[0] = { ...fields[0], label: 'Task Name' };
  const parsed = parseFormSettingsBody({
    fields: [
      ...fields,
      {
        id: 'customer_email',
        key: 'customer_email',
        label: 'Customer Email',
        type: 'email',
        isSystem: false,
        required: true,
        showInTable: true,
        row: 4,
        column: 1,
        order: 7,
      },
    ],
  });

  assert.equal(parsed[0].label, 'Task Name');
  assert.equal(parsed.at(-1)?.type, 'email');
});

test('form settings reject removing required system fields', () => {
  assert.throws(
    () => parseFormSettingsBody({ fields: baseFields().slice(0, -1) }),
    (error: unknown) => error instanceof ValidationError,
  );
});

test('form settings reject more than two columns', () => {
  const fields = baseFields();
  fields[0] = { ...fields[0], column: 3 as unknown as 1 };

  assert.throws(
    () => parseFormSettingsBody({ fields }),
    (error: unknown) =>
      error instanceof ValidationError && error.issues.some((issue) => issue.field.endsWith('.column')),
  );
});

test('form settings reject duplicate layout positions', () => {
  const fields = baseFields();
  fields[1] = { ...fields[1], row: fields[0].row, column: fields[0].column };

  assert.throws(
    () => parseFormSettingsBody({ fields }),
    (error: unknown) => error instanceof ValidationError,
  );
});
