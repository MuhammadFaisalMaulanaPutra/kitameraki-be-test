import { getFormSettingsContainer } from '../config/cosmosClient';
import { FormSettings } from '../models/formSettings.types';
import { stripCosmosMetadata } from '../utils/cosmos';

/**
 * All direct Cosmos DB access for form settings lives here, mirroring
 * `taskRepository.ts`. Nothing outside this file should import
 * `@azure/cosmos` for form settings operations.
 */

/**
 * Reads the form settings document for an organization.
 * Returns `null` if the organization has never saved any settings
 * yet, rather than throwing — an org with no custom fields
 * configured is a normal, expected state, not an error.
 */
export async function getFormSettings(organizationId: string): Promise<FormSettings | null> {
    const container = getFormSettingsContainer();

    // Point read: id and partition key are both organizationId, so
    // this is a single, cheap, strongly-consistent lookup.
    const { resource } = await container.item(organizationId, organizationId).read<FormSettings>();

    return resource ? stripCosmosMetadata(resource) : null;
}

/**
 * Creates or fully replaces the form settings document for an
 * organization. Settings are a single "current configuration" the
 * client owns wholesale, so an upsert-based full replace is simpler
 * and more predictable here than a partial JSON Patch.
 */
export async function upsertFormSettings(settings: FormSettings): Promise<FormSettings> {
    const container = getFormSettingsContainer();
    const { resource } = await container.items.upsert<FormSettings>(settings);

    if (!resource) {
        throw new Error('Cosmos DB did not return the saved form settings.');
    }

    return stripCosmosMetadata(resource);
}