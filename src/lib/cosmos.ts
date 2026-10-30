import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING must be set.");
}

export const cosmosClient = new CosmosClient(connectionString);
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME ?? "TaskApp");
export const tasksContainer = database.container(process.env.COSMOS_CONTAINER_NAME ?? "Tasks");
export const formSettingsContainer = database.container(
    process.env.COSMOS_FORM_SETTINGS_CONTAINER_NAME ?? "FormSettings"
);
