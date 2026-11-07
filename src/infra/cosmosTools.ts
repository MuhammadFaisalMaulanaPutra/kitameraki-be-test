import { seedTasks, seedFormSettings, SEED_ORGANIZATION_ID } from "../seed";
import { taskSchema } from "../domain/task/schema";
import {
    FORM_SETTINGS_ID,
    STAGING_FORM_ID,
    FormSettingsHistory,
    formDefinitionSchema,
    formSettingsSchema,
} from "../domain/form/schema";
import {
    getFormSettingsContainer,
    getFormSettingsHistoryContainer,
    getTasksContainer,
} from "../platform/cosmos";

/* Operational scripts share the backend's connection setup (platform/cosmos.ts,
   which also applies the COSMOS_EMULATOR TLS opt-in) and its own schemas, so a
   schema change fails the script instead of writing drift. */

async function deleteOrgItems(containerId: "formSettings" | "formSettingsHistory"): Promise<number> {
    const container =
        containerId === "formSettings" ? getFormSettingsContainer() : getFormSettingsHistoryContainer();
    const { resources } = await container.items
        .query(
            { query: "SELECT c.id FROM c WHERE c.organizationId = @org", parameters: [{ name: "@org", value: SEED_ORGANIZATION_ID }] },
            { partitionKey: SEED_ORGANIZATION_ID }
        )
        .fetchAll();
    await Promise.all(
        resources.map((item) =>
            container
                .item(item.id, SEED_ORGANIZATION_ID)
                .delete()
                .catch((err) => {
                    if ((err as { code?: number }).code !== 404) throw err;
                })
        )
    );
    return resources.length;
}

export async function deleteAllTasks(container = getTasksContainer()): Promise<number> {
    const { resources } = await container.items
        .query(
            { query: "SELECT c.id FROM c WHERE c.organizationId = @org", parameters: [{ name: "@org", value: SEED_ORGANIZATION_ID }] },
            { partitionKey: SEED_ORGANIZATION_ID }
        )
        .fetchAll();
    await Promise.all(resources.map((item) => container.item(item.id, SEED_ORGANIZATION_ID).delete()));
    return resources.length;
}

/* Drop the publish journal so a seed never leaves a "migration in progress"
   behind that would block the next publish until it goes stale. */
export async function clearPublishJournal(): Promise<boolean> {
    try {
        await getFormSettingsContainer().item(STAGING_FORM_ID, SEED_ORGANIZATION_ID).delete();
        return true;
    } catch (err) {
        if ((err as { code?: number }).code !== 404) throw err;
        return false;
    }
}

/* Delete every form document for the seed organization, including the published
   definition, its journal and any legacy per-version snapshots that predate the
   separate history container. */
export async function deleteSeedFormDocuments(): Promise<number> {
    return deleteOrgItems("formSettings");
}

export async function deleteSeedFormHistory(): Promise<number> {
    return deleteOrgItems("formSettingsHistory");
}

export async function writeSeedTasks(container = getTasksContainer()): Promise<number> {
    // Validate before writing: the seed must always satisfy the live schema.
    const tasks = seedTasks().map((task) => taskSchema.parse(task));
    // Batch the upserts so a large seed does not open every write at once.
    const batchSize = 100;
    for (let i = 0; i < tasks.length; i += batchSize) {
        await Promise.all(tasks.slice(i, i + batchSize).map((task) => container.items.upsert(task)));
    }
    return tasks.length;
}

export async function writeSeedFormSettings(container = getFormSettingsContainer()): Promise<number> {
    const settings = formSettingsSchema.parse(seedFormSettings());
    await container.items.upsert(settings);
    return settings.version;
}

/* Write the single history entry that matches the seeded definition, so history
   starts clean at version 1 instead of inheriting snapshots from older runs. */
export async function writeSeedFormHistory(
    container = getFormSettingsHistoryContainer()
): Promise<number> {
    const settings = formSettingsSchema.parse(seedFormSettings());
    const history: FormSettingsHistory = {
        id: String(settings.version),
        organizationId: SEED_ORGANIZATION_ID,
        version: settings.version,
        definition: formDefinitionSchema.parse({
            version: settings.version,
            title: settings.title,
            description: settings.description,
            coreFields: settings.coreFields,
            customFields: settings.customFields,
            rows: settings.rows,
        }),
        migrations: [],
        publishedAt: settings.updatedAt,
        publishedBy: null,
    };
    await container.items.upsert(history);
    return history.version;
}
