export type StorageProvider = 'cosmos' | 'json';

export interface AppConfig {
  storageProvider: StorageProvider;
  cosmosConnectionString?: string;
  cosmosDatabaseName: string;
  cosmosTasksContainerName: string;
  cosmosFormSettingsContainerName: string;
  localDataDirectory: string;
  defaultOrganizationId?: string;
}

let cachedConfig: AppConfig | undefined;

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readStorageProvider(): StorageProvider {
  const raw = readOptional('STORAGE_PROVIDER') ?? 'cosmos';
  if (raw !== 'cosmos' && raw !== 'json') {
    throw new Error('STORAGE_PROVIDER must be either "cosmos" or "json".');
  }
  return raw;
}

export function getAppConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const storageProvider = readStorageProvider();
  const cosmosConnectionString = readOptional('COSMOS_CONNECTION_STRING');

  if (storageProvider === 'cosmos' && !cosmosConnectionString) {
    throw new Error('COSMOS_CONNECTION_STRING is required when STORAGE_PROVIDER=cosmos.');
  }

  cachedConfig = {
    storageProvider,
    cosmosConnectionString,
    cosmosDatabaseName: readOptional('COSMOS_DATABASE_NAME') ?? 'TaskApp',
    cosmosTasksContainerName: readOptional('COSMOS_TASKS_CONTAINER_NAME') ?? 'Tasks',
    cosmosFormSettingsContainerName: readOptional('COSMOS_FORM_SETTINGS_CONTAINER_NAME') ?? 'FormSettings',
    localDataDirectory: readOptional('LOCAL_DATA_DIRECTORY') ?? '.data',
    defaultOrganizationId: readOptional('DEFAULT_ORGANIZATION_ID'),
  };

  return cachedConfig;
}

export function resetAppConfigForTests(): void {
  cachedConfig = undefined;
}
