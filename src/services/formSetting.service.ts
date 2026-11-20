import { FormSettingRepository, formSettingRepository } from '../repositories/formSetting.repository.js';
import { FormSetting, FORM_SETTINGS_DOC_ID } from '../models/formSetting.model.js';
import { SaveFormSettingSchema } from '../validators/formSetting.validator.js';
import { validateWithZod } from '../validators/task.validator.js';
import { BadRequestError } from '../utils/errors.util.js';

export class FormSettingService {
    constructor(private readonly repo: FormSettingRepository = formSettingRepository) { }

    async getSettings(organizationId: string): Promise<FormSetting> {
        if (!organizationId) {
            throw new BadRequestError('organizationId wajib disertakan!');
        }

        const settings = await this.repo.findByOrganizationId(organizationId);

        return (
            settings || {
                id: FORM_SETTINGS_DOC_ID,
                organizationId,
                fields: [],
            }
        );
    }

    async saveSettings(input: unknown): Promise<FormSetting> {
        const validated = validateWithZod(SaveFormSettingSchema, input);

        const formSetting: FormSetting = {
            id: FORM_SETTINGS_DOC_ID,
            organizationId: validated.organizationId,
            fields: validated.fields,
            updatedAt: new Date().toISOString(),
        };

        return this.repo.upsert(formSetting);
    }
}

export const formSettingService = new FormSettingService();