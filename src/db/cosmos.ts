import { CosmosClient } from '@azure/cosmos';
import type { Container, IndexingPolicy } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import type { AppConfig } from '../config';

export interface CosmosContainers {
  formSettings: Container;
  tasks: Container;
}

export const TASKS_INDEXING_POLICY: IndexingPolicy = {
  automatic: true,
  indexingMode: 'consistent',
  includedPaths: [
    { path: '/_ts/?' },
    { path: '/id/?' },
    { path: '/organizationId/?' },
    { path: '/title/?' },
    { path: '/description/?' },
    { path: '/dueDate/?' },
    { path: '/priority/?' },
    { path: '/status/?' },
    { path: '/tags/[]/?' },
    { path: '/customFields/*' },
  ],
  excludedPaths: [{ path: '/*' }],
  compositeIndexes: [
    [
      { path: '/_ts', order: 'descending' },
      { path: '/id', order: 'ascending' },
    ],
  ],
};

export const FORM_SETTINGS_INDEXING_POLICY: IndexingPolicy = {
  automatic: true,
  indexingMode: 'consistent',
  includedPaths: [],
  excludedPaths: [{ path: '/*' }],
};

export const createCosmosClient = (config: AppConfig): CosmosClient =>
  config.COSMOS_CONNECTION_STRING
    ? new CosmosClient(config.COSMOS_CONNECTION_STRING)
    : new CosmosClient({
        endpoint: config.COSMOS_ENDPOINT!,
        aadCredentials: new DefaultAzureCredential(),
      });

export const getCosmosContainers = (client: CosmosClient, config: AppConfig): CosmosContainers => {
  const database = client.database(config.COSMOS_DATABASE_NAME);
  return {
    tasks: database.container(config.COSMOS_TASKS_CONTAINER_NAME),
    formSettings: database.container(config.COSMOS_FORM_SETTINGS_CONTAINER_NAME),
  };
};
