import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultFormSettings } from '../src/domain/formSettings';
import { ValidationError } from '../src/errors/AppError';
import { FormSettingsService } from '../src/services/FormSettingsService';
import { InMemoryFormSettingsRepository } from './testDoubles';

test('form settings preserve custom field type identity across renames', async () => {
  const organizationId = 'org-local';
  const repository = new InMemoryFormSettingsRepository();
  const service = new FormSettingsService(repository);
  const initial = createDefaultFormSettings(organizationId);
  initial.fields.push({
    id: 'customer_email',
    key: 'customer_email',
    label: 'Customer Email',
    type: 'email',
    isSystem: false,
    required: false,
    showInTable: true,
    row: 4,
    column: 1,
    order: 7,
  });
  await repository.save(initial);

  const renamed = initial.fields.map((field) =>
    field.id === 'customer_email' ? { ...field, label: 'Client Email' } : { ...field },
  );
  const saved = await service.save(organizationId, renamed);
  assert.equal(saved.fields.find((field) => field.id === 'customer_email')?.label, 'Client Email');

  const changedType = renamed.map((field) =>
    field.id === 'customer_email' ? { ...field, type: 'text' as const } : { ...field },
  );
  await assert.rejects(
    service.save(organizationId, changedType),
    (error: unknown) => error instanceof ValidationError,
  );
});
