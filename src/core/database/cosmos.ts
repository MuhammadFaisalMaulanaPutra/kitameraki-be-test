import { CosmosClient } from "@azure/cosmos";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString || connectionString.includes("your-key")) {
  console.error("FATAL ERROR: COSMOS_CONNECTION_STRING is missing or still using dummy value!");
  process.exit(1);
}

const databaseId = process.env.COSMOS_DATABASE || "TaskApp";
if (!databaseId) {
    console.error("FATAL ERROR: COSMOS_DATABASE name is not defined!");
    process.exit(1);
}

const endpoint = connectionString.match(/AccountEndpoint=(.+?);/)?.[1];
console.log(`[CosmosDB] Initializing connection to: ${endpoint}`);

export const cosmosClient = new CosmosClient(connectionString);

export const getContainer = (containerId: string) => {
  console.log(`[CosmosDB] Accessing Container: ${databaseId} / ${containerId}`);
  return cosmosClient.database(databaseId).container(containerId);
}
