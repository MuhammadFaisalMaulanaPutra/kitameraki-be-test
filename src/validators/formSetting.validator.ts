import { z } from 'zod';

export const FieldTypeEnum = z.enum(['text', 'date', 'datetime', 'email']);

export const FormFieldSettingSchema = z.object({
  id: z.string().min(1, { message: 'id field wajib diisi' }),
  key: z.string().trim().min(1, { message: 'key field tidak boleh kosong' }),
  label: z.string().trim().min(1, { message: 'label field tidak boleh kosong' }),
  type: FieldTypeEnum,
  row: z.number().int().nonnegative({ message: 'row harus berupa angka >= 0' }),
  column: z.union([z.literal(1), z.literal(2)]),
  required: z.boolean().optional().default(false),
});

export const SaveFormSettingSchema = z.object({
  organizationId: z.string().uuid({ message: 'organizationId wajib berupa UUID yang valid' }),
  fields: z.array(FormFieldSettingSchema),
});