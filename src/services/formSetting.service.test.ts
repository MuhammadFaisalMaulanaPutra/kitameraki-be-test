import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FormSettingService } from './formSetting.service.js';
import { FormSettingRepository } from '../repositories/formSetting.repository.js';
import { BadRequestError } from '../utils/errors.util.js';
import { FormSetting, FormFieldSetting, FORM_SETTINGS_DOC_ID } from '../models/formSetting.model.js';

describe('FormSettingService Unit Tests (Part 2)', () => {
  let service: FormSettingService;
  let mockRepo: Partial<FormSettingRepository>;
  const mockOrgId = randomUUID();
  const mockFields: FormFieldSetting[] = [
    {
      id: 'field-1',
      key: 'clientEmail',
      label: 'Client Email',
      type: 'email',
      row: 0,
      column: 1,
      required: true,
    },
    {
      id: 'field-2',
      key: 'meetingDate',
      label: 'Meeting Date & Time',
      type: 'datetime',
      row: 0,
      column: 2,
      required: false,
    },
  ];
  const mockSetting: FormSetting = {
    id: FORM_SETTINGS_DOC_ID,
    organizationId: mockOrgId,
    fields: mockFields,
    updatedAt: new Date().toISOString(),
  };
  beforeEach(() => {
    mockRepo = {
      findByOrganizationId: vi.fn(),
      upsert: vi.fn().mockImplementation((setting) => Promise.resolve(setting)),
    };
    service = new FormSettingService(mockRepo as FormSettingRepository);
  });
  
  describe('getSettings', () => {
    it('harus mengembalikan settings yang ada jika data sudah pernah disimpan', async () => {
      (mockRepo.findByOrganizationId as any).mockResolvedValue(mockSetting);
      const result = await service.getSettings(mockOrgId);
      expect(result).toEqual(mockSetting);
      expect(mockRepo.findByOrganizationId).toHaveBeenCalledWith(mockOrgId);
    });
    it('harus mengembalikan default fields kosong jika organisasi belum pernah setting form', async () => {
      (mockRepo.findByOrganizationId as any).mockResolvedValue(null);
      const result = await service.getSettings(mockOrgId);
      expect(result.id).toBe(FORM_SETTINGS_DOC_ID);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.fields).toEqual([]);
    });
    it('harus melempar BadRequestError jika organizationId kosong', async () => {
      await expect(service.getSettings('')).rejects.toThrow(BadRequestError);
    });
  });

  describe('saveSettings', () => {
    it('harus berhasil menyimpan form settings dengan tipe field dan kolom yang valid', async () => {
      const payload = {
        organizationId: mockOrgId,
        fields: mockFields,
      };
      const result = await service.saveSettings(payload);
      expect(result.id).toBe(FORM_SETTINGS_DOC_ID);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.fields.length).toBe(2);
      expect(result.updatedAt).toBeDefined();
      expect(mockRepo.upsert).toHaveBeenCalledTimes(1);
    });
    it('harus melempar BadRequestError jika column lebih dari 2 (maksimal 2 kolom)', async () => {
      const invalidPayload = {
        organizationId: mockOrgId,
        fields: [
          {
            id: 'field-x',
            key: 'invalidCol',
            label: 'Invalid Column',
            type: 'text',
            row: 0,
            column: 3,
          },
        ],
      };
      await expect(service.saveSettings(invalidPayload)).rejects.toThrow(BadRequestError);
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });
    it('harus melempar BadRequestError jika field type tidak valid', async () => {
      const invalidPayload = {
        organizationId: mockOrgId,
        fields: [
          {
            id: 'field-y',
            key: 'customNumber',
            label: 'Number Field',
            type: 'number',
            row: 0,
            column: 1,
          },
        ],
      };
      await expect(service.saveSettings(invalidPayload)).rejects.toThrow(BadRequestError);
    });
    it('harus melempar BadRequestError jika organizationId bukan UUID', async () => {
      const invalidPayload = {
        organizationId: 'bukan-uuid',
        fields: [],
      };
      await expect(service.saveSettings(invalidPayload)).rejects.toThrow(BadRequestError);
    });
  });
});