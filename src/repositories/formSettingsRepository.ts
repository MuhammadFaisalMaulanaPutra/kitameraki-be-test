import { formSettingsContainer } from "../lib/cosmos";
import { getErrorStatusCode } from "../lib/errors";
import type { FormSettingsDocument } from "../types/formSettings";

export async function readFormSettings(
    organizationId: string
): Promise<FormSettingsDocument | undefined> {
    try {
        const { resource } = await formSettingsContainer
            .item(organizationId, organizationId)
            .read<FormSettingsDocument>();
        return resource;
    } catch (error) {
        if (getErrorStatusCode(error) === 404) {
            return undefined;
        }
        throw error;
    }
}

export async function saveFormSettings(
    settings: FormSettingsDocument
): Promise<FormSettingsDocument> {
    const { resource } = await formSettingsContainer.items.upsert<FormSettingsDocument>(settings);
    if (!resource) {
        throw new Error("Cosmos upsert returned no form settings resource.");
    }
    return resource;
}
