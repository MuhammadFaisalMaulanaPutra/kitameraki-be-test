import { builtInFields } from "../lib/formSettingsSchema";
import type { FormSettingsInput } from "../lib/formSettingsSchema";
import { ValidationError } from "../lib/errors";
import { toFormSettingsDto } from "../mappers/formSettingsMapper";
import * as formSettingsRepository from "../repositories/formSettingsRepository";
import type { FormSettingsDto } from "../types/formSettings";

export function getDefaultFormSettings(organizationId: string): FormSettingsDto {
    return {
        id: organizationId,
        organizationId,
        fields: builtInFields.map(field => ({ ...field })),
        rows: [
            { id: "row-title-description", fieldIds: ["title", "description"] },
            { id: "row-dueDate-priority", fieldIds: ["dueDate", "priority"] },
            { id: "row-status-tags", fieldIds: ["status", "tags"] }
        ]
    };
}

export async function getFormSettings(organizationId: string): Promise<FormSettingsDto> {
    const settings = await formSettingsRepository.readFormSettings(organizationId);
    return settings ? toFormSettingsDto(settings) : getDefaultFormSettings(organizationId);
}

export async function saveFormSettings(
    organizationId: string,
    input: FormSettingsInput
): Promise<FormSettingsDto> {
    const existing = await formSettingsRepository.readFormSettings(organizationId);
    if (existing) {
        const nextFieldsById = new Map(input.fields.map(field => [field.id, field]));
        const changedTypes = existing.fields
            .filter(field => !field.builtIn)
            .filter(field => nextFieldsById.get(field.id)?.type !== undefined)
            .filter(field => nextFieldsById.get(field.id)?.type !== field.type)
            .map(field => field.id);

        if (changedTypes.length > 0) {
            throw new ValidationError({
                formErrors: [],
                fieldErrors: {
                    fields: changedTypes.map(fieldId => `Custom field type cannot be changed: ${fieldId}.`)
                }
            });
        }
    }

    const settings = await formSettingsRepository.saveFormSettings({
        id: organizationId,
        organizationId,
        ...input
    });
    return toFormSettingsDto(settings);
}
