import type { Container, ContainerRequest, IndexingPolicy } from '@azure/cosmos';
import { getConfig } from '../config';
import { createCosmosClient, FORM_SETTINGS_INDEXING_POLICY, TASKS_INDEXING_POLICY } from './cosmos';
import type { AppConfig } from '../config';

const PARTITION_KEY = '/organizationId';

const normalizePolicy = (policy: IndexingPolicy | undefined): string =>
  JSON.stringify({
    automatic: policy?.automatic,
    indexingMode: policy?.indexingMode,
    includedPaths: policy?.includedPaths ?? [],
    excludedPaths: policy?.excludedPaths ?? [],
    compositeIndexes: policy?.compositeIndexes ?? [],
  });

const ensureContainer = async (
  databaseContainers: {
    createIfNotExists(definition: ContainerRequest): Promise<{ container: Container }>;
  },
  id: string,
  indexingPolicy: IndexingPolicy,
): Promise<void> => {
  const { container } = await databaseContainers.createIfNotExists({
    id,
    partitionKey: PARTITION_KEY,
  });
  const { resource } = await container.read();
  if (normalizePolicy(resource?.indexingPolicy) === normalizePolicy(indexingPolicy)) return;

  await container.replace({
    id,
    partitionKey: { paths: [PARTITION_KEY] },
    indexingPolicy,
  });
};

export const provisionCosmos = async (config: AppConfig): Promise<void> => {
  const client = createCosmosClient(config);
  try {
    const { database } = await client.databases.createIfNotExists({
      id: config.COSMOS_DATABASE_NAME,
    });
    await ensureContainer(
      database.containers,
      config.COSMOS_TASKS_CONTAINER_NAME,
      TASKS_INDEXING_POLICY,
    );
    await ensureContainer(
      database.containers,
      config.COSMOS_FORM_SETTINGS_CONTAINER_NAME,
      FORM_SETTINGS_INDEXING_POLICY,
    );
  } finally {
    await client.dispose();
  }
};

const main = async (): Promise<void> => {
  try {
    await provisionCosmos(getConfig());
    process.stdout.write('Cosmos DB local resources are ready.\n');
  } catch (error) {
    process.stderr.write(
      `Cosmos DB provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    process.exitCode = 1;
  }
};

if (require.main === module) void main();
