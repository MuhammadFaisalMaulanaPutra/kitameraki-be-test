import { CosmosClient, type Container, type Database } from '@azure/cosmos';
import type { CosmosConfig } from '../config/env';

export interface CosmosContainers {
  database: Database;
  tasks: Container;
  formSettings: Container;
}

export function createCosmosClient(config: CosmosConfig): CosmosClient {
  return new CosmosClient({
    endpoint: config.endpoint,
    key: config.key,
    // The local emulator advertises "localhost" as its endpoint; discovery must be disabled
    // when the API reaches it through another hostname (e.g. the docker-compose service name).
    connectionPolicy: { enableEndpointDiscovery: config.enableEndpointDiscovery },
  });
}

/** Container references are resolved lazily by the SDK; no network call happens here. */
export function getContainers(client: CosmosClient, config: CosmosConfig): CosmosContainers {
  const database = client.database(config.databaseId);
  return {
    database,
    tasks: database.container(config.tasksContainerId),
    formSettings: database.container(config.formSettingsContainerId),
  };
}

/** Creates the database and containers when missing (idempotent). Both containers are partitioned per organization. */
export async function ensureCosmosResources(client: CosmosClient, config: CosmosConfig): Promise<void> {
  const { database } = await client.databases.createIfNotExists({ id: config.databaseId });
  await database.containers.createIfNotExists({
    id: config.tasksContainerId,
    partitionKey: { paths: ['/organizationId'] },
  });
  await database.containers.createIfNotExists({
    id: config.formSettingsContainerId,
    partitionKey: { paths: ['/organizationId'] },
  });
}
