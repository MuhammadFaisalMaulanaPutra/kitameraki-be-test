import type { Request, Response } from 'express';
import { getOrganizationId } from '../middlewares/organization-context.middleware';
import type { FormSettingsService } from '../services/form-settings.service';
import { sendSuccess } from '../utils/response';
import { updateFormSettingsSchema } from '../validators/form-settings.validator';
import { validateBody } from '../validators/validate';

export class FormSettingsController {
  constructor(private readonly formSettingsService: FormSettingsService) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.formSettingsService.getSettings(getOrganizationId(req));
    sendSuccess(res, 200, 'Form settings retrieved successfully', settings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = validateBody(updateFormSettingsSchema, req.body);
    const settings = await this.formSettingsService.updateSettings(getOrganizationId(req), input);
    sendSuccess(res, 200, 'Form settings saved successfully', settings);
  };
}
