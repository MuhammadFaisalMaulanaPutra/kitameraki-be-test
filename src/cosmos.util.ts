import { CosmosClient, ConsistencyLevel } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { Config } from "./config";

let cosmosClient: CosmosClient | null = null;

/**
 * Gets or creates Cosmos DB client singleton
 * @returns Cosmos DB client instance
 */
export function getDefaultCosmosClient(): CosmosClient {
  if (cosmosClient) {
    return cosmosClient;
  }

  const credential = new DefaultAzureCredential();

  cosmosClient = new CosmosClient({
    endpoint: Config.COSMOS_ENDPOINT,
    aadCredentials: credential,
    consistencyLevel: ConsistencyLevel.Session,
    userAgentSuffix: `TaskApp/${Config.APP_VERSION}`,
  });

  return cosmosClient;
}

/**
 * Graceful shutdown for Function App lifecycle
 * @returns Promise that resolves when client is disposed
 */
export async function closeCosmosClient(): Promise<void> {
  if (cosmosClient) {
    await cosmosClient.dispose();
    cosmosClient = null;
  }
}
