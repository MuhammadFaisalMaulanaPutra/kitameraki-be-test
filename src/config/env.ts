export interface AppConfig {
  storageMode: 'cosmos' | 'memory';
  cosmosAuthMode: 'key' | 'managed-identity';
  cosmosEndpoint: string;
  cosmosKey: string;
  cosmosDatabase: string;
  cosmosContainer: string;
}

function requiredSetting(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppConfig(): AppConfig {
  const storageMode = process.env.STORAGE_MODE === 'memory' ? 'memory' : 'cosmos';
  const cosmosAuthMode = process.env.COSMOS_DB_AUTH_MODE === 'managed-identity' ? 'managed-identity' : 'key';
  return {
    storageMode,
    cosmosAuthMode,
    cosmosEndpoint: storageMode === 'cosmos' ? requiredSetting('COSMOS_DB_ENDPOINT') : (process.env.COSMOS_DB_ENDPOINT ?? ''),
    cosmosKey: storageMode === 'cosmos' && cosmosAuthMode === 'key' ? requiredSetting('COSMOS_DB_KEY') : '',
    cosmosDatabase: storageMode === 'cosmos' ? requiredSetting('COSMOS_DB_DATABASE') : (process.env.COSMOS_DB_DATABASE ?? ''),
    cosmosContainer: storageMode === 'cosmos' ? requiredSetting('COSMOS_DB_CONTAINER') : (process.env.COSMOS_DB_CONTAINER ?? '')
  };
}
