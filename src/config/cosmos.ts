import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { getAppConfig } from './env';

const config = getAppConfig();
const client = config.storageMode === 'cosmos'
  ? config.cosmosAuthMode === 'managed-identity'
    ? new CosmosClient({ endpoint: config.cosmosEndpoint, aadCredentials: new DefaultAzureCredential() })
    : new CosmosClient({ endpoint: config.cosmosEndpoint, key: config.cosmosKey })
  : undefined;

export const tasksContainer = client?.database(config.cosmosDatabase).container(config.cosmosContainer);

export async function verifyCosmosConnection(): Promise<void> {
  if (!client) return;
  await client.getDatabaseAccount();
}
