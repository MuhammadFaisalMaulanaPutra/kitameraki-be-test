import * as formSettingRepository from "@/repositories/form-setting.repository";
import { FormSetting, FormComponent } from "@/schemas/form-setting.schema";
import { BadRequestError } from "@/utils/errors";

export async function getFormSetting(organizationId: string): Promise<FormSetting> {
  if (!organizationId) {
    throw new BadRequestError("organizationId is required");
  }

  const existing = await formSettingRepository.findByOrganizationId(organizationId);
  if (existing) {
    if (!existing.components && (existing as any).fields) {
      existing.components = (existing as any).fields.map((f: any) => ({
        id: f.id,
        key: f.id.replace(/^Field_/, "").replace(/^fld-/, ""),
        label: f.name || f.label || f.id,
        type: f.type,
        layout: { row: f.row ?? 0, column: f.column ?? 1 },
        validate: { required: f.required ?? false },
        description: f.placeholder || f.description,
      }));
    }
    return existing;
  }

  return {
    id: "default",
    organizationId,
    schemaVersion: 1,
    exporter: {
      name: "kitameraki-form-builder",
      version: "1.0.0",
    },
    type: "default",
    components: [],
  };
}

export async function upsertFormSetting(
  organizationId: string,
  components: FormComponent[],
  schemaVersion: number = 1
): Promise<FormSetting> {
  if (!organizationId) {
    throw new BadRequestError("organizationId is required");
  }

  const setting: FormSetting = {
    id: "default",
    organizationId,
    schemaVersion,
    exporter: {
      name: "kitameraki-form-builder",
      version: "1.0.0",
    },
    type: "default",
    components,
  };

  return formSettingRepository.upsert(setting);
}
