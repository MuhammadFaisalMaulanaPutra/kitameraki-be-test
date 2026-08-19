import { randomUUID } from 'crypto';
import * as formSettingsRepository from '../repositories/formSettingsRepository';
import { validateUpdateFormSettingsInput } from '../middleware/validateSchema';
import { CustomFieldConfig, FormSettings, UpdateFormSettingsInput } from '../models/formSettings.types';
import { BadRequestError } from '../utils/errors';

const MAX_FIELDS = 100;

/**
 * Returns the org's form settings, or an empty-fields default if the
 * org has never saved any. Callers (e.g. the client's task list and
 * add-task form) can always render the result without a special
 * "not configured yet" case.
 */
export async function getFormSettings(organizationId: string): Promise<FormSettings> {
    const existing = await formSettingsRepository.getFormSettings(organizationId);

    if (existing) {
        return existing;
    }

    return {
        id: organizationId,
        organizationId,
        fields: [],
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Assigns a stable id to any brand-new field (one with no id, e.g.
 * just added by the client) while preserving the id of fields being
 * renamed, retyped, or repositioned, so custom values already stored
 * against a field's id on existing tasks stay linked to it.
 */
function withStableIds(fields: UpdateFormSettingsInput['fields']): CustomFieldConfig[] {
    return fields.map((field) => ({
        ...field,
        id: field.id ?? randomUUID(),
    }));
}

/**
 * Rejects field configurations that would silently overlap in the
 * form grid (two fields claiming the same row + column), which is
 * far cheaper to catch here than to debug as a rendering glitch on
 * the client.
 */
function assertNoPositionCollisions(fields: CustomFieldConfig[]): void {
    const seen = new Set<string>();

    for (const field of fields) {
        const key = `${field.row}:${field.column}`;
        if (seen.has(key)) {
            throw new BadRequestError(
                `Field position row ${field.row}, column ${field.column} is used by more than one field.`
            );
        }
        seen.add(key);
    }
}

export async function updateFormSettings(
    organizationId: string,
    input: UpdateFormSettingsInput
): Promise<FormSettings> {
    validateUpdateFormSettingsInput(input);

    if (input.fields.length > MAX_FIELDS) {
        throw new BadRequestError(`Cannot configure more than ${MAX_FIELDS} custom fields.`);
    }

    const fields = withStableIds(input.fields);
    assertNoPositionCollisions(fields);

    const settings: FormSettings = {
        id: organizationId,
        organizationId,
        fields,
        updatedAt: new Date().toISOString(),
    };

    return formSettingsRepository.upsertFormSettings(settings);
}
