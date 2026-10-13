import { CosmosClient, Container } from '@azure/cosmos';

let containerInstance: Container | null = null;

export function getTaskContainer(): Container {
  if (containerInstance) {
    return containerInstance;
  }

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'TaskApp';
  const containerName = process.env.COSMOS_CONTAINER_NAME || 'Tasks';
  if (!connectionString) {
    throw new Error(
      'Environment variable COSMOS_CONNECTION_STRING belum dikonfigurasi di local.settings.json!'
    );
  }
  const client = new CosmosClient(connectionString);
  const database = client.database(databaseName);
  containerInstance = database.container(containerName);
  return containerInstance;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const container = getTaskContainer();
    await container.read();
    return true;
  } catch {
    return false;
  }
}