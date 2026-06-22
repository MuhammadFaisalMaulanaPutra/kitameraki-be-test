import { CosmosClient } from "@azure/cosmos";
import { getEnv } from "../utils/env";

const endpoint = getEnv("COSMOS_ENDPOINT");
const key = getEnv("COSMOS_KEY");
const databaseName = getEnv("COSMOS_DATABASE");
const containerName = getEnv("COSMOS_CONTAINER");

export const client = new CosmosClient({
  endpoint,
  key,
});

export const database = client.database(databaseName);
export const container = database.container(containerName);
