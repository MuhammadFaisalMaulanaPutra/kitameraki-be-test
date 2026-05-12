import { CosmosClient } from '@azure/cosmos';

let client: CosmosClient | null = null;

export function getCosmosClient(): CosmosClient {
  if (client) return client;

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
  }

  client = new CosmosClient({
    endpoint,
    key,
    connectionPolicy: { enableEndpointDiscovery: false },
  });

  return client;
}

export const DB_NAME = 'TaskApp';
export const TASKS_CONTAINER = 'Tasks';
export const FORM_SETTINGS_CONTAINER = 'FormSettings';
