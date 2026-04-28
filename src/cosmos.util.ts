import { CosmosClient, ConsistencyLevel } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { COSMOS_ENDPOINT } from "./config";

let cosmosClient: CosmosClient | null = null;

export function getDefaultCosmosClient(): CosmosClient {
  if (cosmosClient) {
    return cosmosClient;
  }

  const credential = new DefaultAzureCredential();

  cosmosClient = new CosmosClient({
    endpoint: COSMOS_ENDPOINT,
    aadCredentials: credential,
    consistencyLevel: ConsistencyLevel.Session,
    userAgentSuffix: `TaskApp/${process.env.APP_VERSION || "1.0.0"}`,
  });

  return cosmosClient;
}

export async function closeCosmosClient(): Promise<void> {
  if (cosmosClient) {
    await cosmosClient.dispose();
    cosmosClient = null;
  }
}
