import { formSettingsSchema } from '../src/validators/form-settings.validator';
import { defaultFormFields } from '../src/models/form-settings.model';

describe('form settings validation', () => {
  it('accepts the default fields', () => {
    expect(formSettingsSchema.safeParse({ fields: defaultFormFields }).success).toBe(true);
  });

  it('requires all system fields', () => {
    const fields = defaultFormFields.filter((field) => field.key !== 'status');
    expect(formSettingsSchema.safeParse({ fields }).success).toBe(false);
  });

  it('rejects duplicate field keys', () => {
    const fields = [...defaultFormFields, { ...defaultFormFields[0], id: 'another-title' }];
    expect(formSettingsSchema.safeParse({ fields }).success).toBe(false);
  });
});
