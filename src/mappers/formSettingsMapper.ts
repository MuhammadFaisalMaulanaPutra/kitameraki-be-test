import type { FormSettingsDocument, FormSettingsDto } from "../types/formSettings";

export function toFormSettingsDto(settings: FormSettingsDocument): FormSettingsDto {
    return {
        id: settings.id,
        organizationId: settings.organizationId,
        rows: settings.rows,
        fields: settings.fields
    };
}
