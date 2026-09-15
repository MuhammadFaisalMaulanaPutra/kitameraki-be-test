import { formSettingsContainer } from "../config/cosmos";
import type { FormSettings } from "../models/FormSettings";
import type { TaskField } from "../models/TaskField";

export async function getFormSettings(
    organizationId: string
): Promise<FormSettings | null> {
    try {
        const { resource } =
            await formSettingsContainer
                .item(organizationId, organizationId)
                .read<FormSettings>();

        return resource ?? null;
    } catch (error: any) {
        if (error.code === 404) {
            return null;
        }

        throw error;
    }
}

export async function saveFormSettings(
    organizationId: string,
    fields: TaskField[]
): Promise<FormSettings> {
    const settings: FormSettings = {
        id: organizationId,
        organizationId,
        fields,
    };

    const { resource } =
        await formSettingsContainer.items.upsert<FormSettings>(settings);

    if (!resource) {
        throw new Error("Failed to save form settings");
    }

    return resource;
}