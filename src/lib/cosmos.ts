import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("COSMOS_CONNECTION_STRING is not set");
}

const database = new CosmosClient(connectionString).database("TaskApp");

export const tasks = database.container("Tasks");
export const formSettings = database.container("FormSettings");