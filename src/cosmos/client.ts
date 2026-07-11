import { Container, CosmosClient, Database } from '@azure/cosmos';
import { getConfig } from '../config/env';

/**
 * A single CosmosClient is shared across all function invocations. The client
 * manages its own connection pool, so creating one per request (as the original
 * code did) is wasteful and can exhaust sockets under load.
 */
let client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!client) {
    client = new CosmosClient(getConfig().cosmos.connectionString);
  }
  return client;
}

function getDatabase(): Database {
  return getClient().database(getConfig().cosmos.databaseName);
}

export function getTasksContainer(): Container {
  return getDatabase().container(getConfig().cosmos.tasksContainer);
}

export function getFormSettingsContainer(): Container {
  return getDatabase().container(getConfig().cosmos.formSettingsContainer);
}
