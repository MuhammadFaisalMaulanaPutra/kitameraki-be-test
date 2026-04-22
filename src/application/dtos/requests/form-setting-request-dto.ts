import z from "zod"
import { FieldSchema, FormSettingSchema } from "../../validators/form-setting-validator"
import { Organization } from "../../validators/schema-validator";

export type FormFieldInput = z.infer<typeof FieldSchema>;
export type FormSettingInput = z.infer<typeof FormSettingSchema>;

export type FormSettingDTO = FormSettingInput & Organization;