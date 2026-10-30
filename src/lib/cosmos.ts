import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING must be set.");
}

export const cosmosClient = new CosmosClient(connectionString);
export const tasksContainer = cosmosClient
    .database(process.env.COSMOS_DATABASE_NAME ?? "TaskApp")
    .container(process.env.COSMOS_CONTAINER_NAME ?? "Tasks");
