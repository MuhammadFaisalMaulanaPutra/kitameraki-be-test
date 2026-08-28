import { Container, CosmosClient } from '@azure/cosmos';
import { getAppConfig } from '../../config/appConfig';

let client: CosmosClient | undefined;

function getClient(): CosmosClient {
  if (client) {
    return client;
  }

  const config = getAppConfig();
  if (!config.cosmosConnectionString) {
    throw new Error('Cosmos DB is not configured.');
  }

  client = new CosmosClient(config.cosmosConnectionString);
  return client;
}

export function getTasksContainer(): Container {
  const config = getAppConfig();
  return getClient().database(config.cosmosDatabaseName).container(config.cosmosTasksContainerName);
}

export function getFormSettingsContainer(): Container {
  const config = getAppConfig();
  return getClient().database(config.cosmosDatabaseName).container(config.cosmosFormSettingsContainerName);
}
