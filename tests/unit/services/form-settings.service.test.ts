import type { IFormSettingsRepository } from '../../../src/interfaces/form-settings.repository.interface';
import { createTemplateRows, type FormSettings } from '../../../src/models/form-settings.model';
import { createDefaultFormSettings, FormSettingsService } from '../../../src/services/form-settings.service';
import { updateFormSettingsSchema } from '../../../src/validators/form-settings.validator';
import { reviewerEmailField, templateWithCustomRows } from '../../helpers/form-fixtures';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
const NOW = new Date('2026-11-23T10:00:00.000Z');

const storedSettings: FormSettings = {
  id: 'task-form',
  organizationId: ORG_ID,
  schemaVersion: 3,
  rows: templateWithCustomRows([reviewerEmailField]),
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('FormSettingsService', () => {
  let repository: jest.Mocked<IFormSettingsRepository>;
  let service: FormSettingsService;

  beforeEach(() => {
    repository = {
      findByOrganization: jest.fn(),
      upsert: jest.fn(async (settings: FormSettings) => settings),
    };
    service = new FormSettingsService(repository, () => NOW);
  });

  it('returns the task template when the organization has no settings', async () => {
    repository.findByOrganization.mockResolvedValue(null);

    const settings = await service.getSettings(ORG_ID);

    expect(settings).toEqual(createDefaultFormSettings(ORG_ID));
    expect(settings.rows).toEqual(createTemplateRows());
    expect(settings.updatedAt).toBeNull();
  });

  it('returns stored settings', async () => {
    repository.findByOrganization.mockResolvedValue(storedSettings);
    await expect(service.getSettings(ORG_ID)).resolves.toEqual(storedSettings);
  });

  it('saves the rows and the version tag with the current schema version and timestamp', async () => {
    const input = updateFormSettingsSchema.parse({
      versionTag: ' v2 ',
      rows: [{ id: 'row_1', fields: [{ id: 'f_title', type: 'text', key: 'title', label: 'Name' }] }],
    });

    const saved = await service.updateSettings(ORG_ID, input);

    expect(saved).toEqual({
      id: 'task-form',
      organizationId: ORG_ID,
      schemaVersion: 3,
      versionTag: 'v2',
      rows: [{ id: 'row_1', fields: [{ id: 'f_title', type: 'text', key: 'title', label: 'Name' }] }],
      updatedAt: NOW.toISOString(),
    });
  });

  it('omits an empty version tag', async () => {
    const saved = await service.updateSettings(ORG_ID, updateFormSettingsSchema.parse({ rows: [], versionTag: '  ' }));
    expect(saved).not.toHaveProperty('versionTag');
  });

  it('returns the component tree of the form', async () => {
    repository.findByOrganization.mockResolvedValue(storedSettings);

    const rows = await service.getRows(ORG_ID);

    expect(rows).toEqual(storedSettings.rows);
    expect(rows.at(-1)?.fields[0].key).toBe('reviewerEmail');
  });
});
