import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING;
if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING is not defined in the environment variables.");
}

export const client = new CosmosClient(connectionString);
export const databaseId = process.env.COSMOS_DATABASE_ID || "TaskApp";
export const containerId = process.env.COSMOS_CONTAINER_ID || "Tasks";