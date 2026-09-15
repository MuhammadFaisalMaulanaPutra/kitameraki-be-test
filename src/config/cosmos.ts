import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;

if (!connectionString) {
    throw new Error("COSMOS_DB_CONNECTION_STRING is not configured");
}

export const cosmosClient = new CosmosClient(connectionString);

export const databaseName =
    process.env.COSMOS_DB_DATABASE_NAME || "TaskApp";

export const containerName =
    process.env.COSMOS_DB_CONTAINER_NAME || "Tasks";

export const tasksContainer = cosmosClient
    .database(databaseName)
    .container(containerName);

export const formSettingsContainer = cosmosClient
    .database(databaseName)
    .container(
        process.env.COSMOS_DB_FORM_SETTINGS_CONTAINER_NAME || "FormSettings"
    );