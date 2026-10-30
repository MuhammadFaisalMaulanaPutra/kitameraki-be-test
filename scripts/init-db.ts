import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";

function loadLocalSettings(): void {
    const settingsPath = join(process.cwd(), "local.settings.json");

    try {
        const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as {
            Values?: Record<string, unknown>;
        };

        for (const [key, value] of Object.entries(settings.Values ?? {})) {
            if (typeof value === "string" && process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}

async function main(): Promise<void> {
    loadLocalSettings();

    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error("COSMOS_CONNECTION_STRING must be set.");
    }

    const databaseName = process.env.COSMOS_DATABASE_NAME ?? "TaskApp";
    const containerName = process.env.COSMOS_CONTAINER_NAME ?? "Tasks";
    const formSettingsContainerName =
        process.env.COSMOS_FORM_SETTINGS_CONTAINER_NAME ?? "FormSettings";
    const client = new CosmosClient(connectionString);
    const { database } = await client.databases.createIfNotExists({ id: databaseName });

    await database.containers.createIfNotExists({
        id: containerName,
        partitionKey: { paths: ["/organizationId"], kind: PartitionKeyKind.Hash }
    });
    await database.containers.createIfNotExists({
        id: formSettingsContainerName,
        partitionKey: { paths: ["/organizationId"], kind: PartitionKeyKind.Hash }
    });

    const container = database.container(containerName);
    const { resource: definition } = await container.read();
    if (!definition) {
        throw new Error(`Container ${databaseName}/${containerName} could not be read.`);
    }

    await container.replace({
        ...definition,
        indexingPolicy: {
            ...definition.indexingPolicy,
            compositeIndexes: [
                [
                    { path: "/createdAt", order: "descending" },
                    { path: "/id", order: "ascending" }
                ]
            ]
        }
    });

    console.log(
        `Initialized ${databaseName}/${containerName} with its composite index and ${formSettingsContainerName}.`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
