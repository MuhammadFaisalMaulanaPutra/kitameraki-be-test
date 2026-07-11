import { CosmosClient, Database, Container } from '@azure/cosmos';
import { CONSTANTS } from './constants';

let cosmosClient: CosmosClient | null = null;

function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    const connectionString = process.env.COSMOSDB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('COSMOSDB_CONNECTION_STRING environment variable is not set');
    }
    cosmosClient = new CosmosClient(connectionString);
  }
  return cosmosClient;
}

export async function getDatabase(): Promise<Database> {
  const client = getCosmosClient();
  const { database } = await client.databases.createIfNotExists({
    id: CONSTANTS.DATABASE_NAME,
  });
  return database;
}

export async function getTasksContainer(): Promise<Container> {
  const database = await getDatabase();
  const { container } = await database.containers.createIfNotExists({
    id: CONSTANTS.CONTAINERS.TASKS,
    partitionKey: { paths: ['/organizationId'] },
  });
  return container;
}

export async function getFormConfigsContainer(): Promise<Container> {
  const database = await getDatabase();
  const { container } = await database.containers.createIfNotExists({
    id: CONSTANTS.CONTAINERS.FORM_CONFIGS,
    partitionKey: { paths: ['/organizationId'] },
  });
  return container;
}
