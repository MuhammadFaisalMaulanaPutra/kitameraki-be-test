import type { Container } from '@azure/cosmos';
import { createActionRow, createTemplateRows, type FormSettings } from '../../../src/models/form-settings.model';
import {
  CosmosFormSettingsRepository,
  migrateLegacySettings,
  migrateV2Settings,
} from '../../../src/repositories/cosmos/form-settings.repository';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';

function createContainerMock() {
  const item = { read: jest.fn() };
  const container = { item: jest.fn(() => item), items: { upsert: jest.fn() } };
  return { container, item };
}

const settings: FormSettings = {
  id: 'task-form',
  organizationId: ORG_ID,
  schemaVersion: 3,
  versionTag: 'v1',
  rows: createTemplateRows(),
  updatedAt: '2026-11-23T00:00:00.000Z',
};

const customRow = {
  id: 'row_1',
  fields: [{ id: 'field_email', type: 'email' as const, key: 'reviewer', label: 'Reviewer' }],
};

describe('CosmosFormSettingsRepository', () => {
  it('reads the settings document from the organization partition', async () => {
    const { container, item } = createContainerMock();
    item.read.mockResolvedValue({ resource: { ...settings, _etag: 'x' } });
    const repository = new CosmosFormSettingsRepository(container as unknown as Container);

    const result = await repository.findByOrganization(ORG_ID);

    expect(container.item).toHaveBeenCalledWith('task-form', ORG_ID);
    expect(result).toEqual(settings);
  });

  it('upgrades a version 2 document on read: the Submit / Reset row is appended', async () => {
    const { container, item } = createContainerMock();
    item.read.mockResolvedValue({
      resource: { ...settings, schemaVersion: 2, versionTag: undefined, rows: [customRow] },
    });
    const repository = new CosmosFormSettingsRepository(container as unknown as Container);

    const result = await repository.findByOrganization(ORG_ID);

    expect(result?.schemaVersion).toBe(3);
    expect(result?.rows).toEqual([customRow, createActionRow()]);
  });

  it('upgrades a version 1 document on read (v1 -> v2 -> v3)', async () => {
    const { container, item } = createContainerMock();
    item.read.mockResolvedValue({
      resource: {
        id: 'task-form',
        organizationId: ORG_ID,
        systemFieldLabels: { title: 'Task Name' },
        rows: [{ id: 'row_1', fields: [{ id: 'field_email', label: 'Reviewer', type: 'email', required: true }] }],
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    });
    const repository = new CosmosFormSettingsRepository(container as unknown as Container);

    const result = await repository.findByOrganization(ORG_ID);

    expect(result?.schemaVersion).toBe(3);
    expect(result?.rows[0].fields[0]).toMatchObject({ key: 'title', label: 'Task Name' });
    expect(result?.rows.at(-2)).toEqual({
      id: 'row_1',
      fields: [{ id: 'field_email', type: 'email', key: 'field_email', label: 'Reviewer', required: true }],
    });
    expect(result?.rows.at(-1)).toEqual(createActionRow());
    expect(result?.rows.filter((row) => row.id === 'row_actions')).toHaveLength(1);
  });

  it('returns null when the organization has no settings', async () => {
    const { container, item } = createContainerMock();
    item.read.mockRejectedValue(Object.assign(new Error('not found'), { code: 404 }));
    const repository = new CosmosFormSettingsRepository(container as unknown as Container);

    await expect(repository.findByOrganization(ORG_ID)).resolves.toBeNull();
  });

  it('upserts the settings document', async () => {
    const { container } = createContainerMock();
    container.items.upsert.mockResolvedValue({ resource: { ...settings, _rid: 'r' } });
    const repository = new CosmosFormSettingsRepository(container as unknown as Container);

    await expect(repository.upsert(settings)).resolves.toEqual(settings);
    expect(container.items.upsert).toHaveBeenCalledWith(settings);
  });
});

describe('migrateLegacySettings (v1 -> v2)', () => {
  it('keeps the template labels when nothing was renamed (v2 had no buttons)', () => {
    const migrated = migrateLegacySettings({ id: 'task-form', organizationId: ORG_ID });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.rows).toEqual(createTemplateRows().filter((row) => row.id !== 'row_actions'));
    expect(migrated.updatedAt).toBeNull();
    expect(migrateV2Settings(migrated).rows).toEqual(createTemplateRows());
  });
});

describe('migrateV2Settings (v2 -> v3)', () => {
  const v2: FormSettings = { ...settings, schemaVersion: 2, rows: [customRow] };

  it('does not add a second action row', () => {
    const rows = [customRow, { ...createActionRow(), fields: [createActionRow().fields[0]] }];
    expect(migrateV2Settings({ ...v2, rows })).toEqual({ ...v2, schemaVersion: 3, rows });
  });

  it('keeps field ids unique', () => {
    const taken = { id: 'row_2', fields: [{ id: 'field_submit', type: 'text' as const, key: 'a', label: 'A' }] };
    const migrated = migrateV2Settings({ ...v2, rows: [taken] });
    expect(migrated.rows.at(-1)?.fields.map((field) => field.id)).toEqual(['field_submit_2', 'field_reset']);
  });
});
