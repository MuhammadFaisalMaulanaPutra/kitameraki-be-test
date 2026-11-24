import { loadConfig } from '../../../src/config/env';

const baseEnv = {
  COSMOS_ENDPOINT: 'http://localhost:8081',
  COSMOS_KEY: 'key',
  AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true',
};

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig(baseEnv);

    expect(config.app).toMatchObject({
      nodeEnv: 'development',
      port: 7071,
      trustProxy: 0,
      jsonBodyLimit: '100kb',
      fileMaxSizeBytes: 5_242_880,
    });
    expect(config.cosmos).toMatchObject({
      databaseId: 'TaskApp',
      tasksContainerId: 'Tasks',
      formSettingsContainerId: 'FormSettings',
      enableEndpointDiscovery: true,
      autoCreateResources: true,
    });
    expect(config.storage).toEqual({
      connectionString: 'UseDevelopmentStorage=true',
      filesContainer: 'task-files',
      autoCreateContainer: true,
    });
  });

  it('parses lists, numbers and booleans', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: '8080',
      CORS_ORIGINS: 'http://a.com, http://b.com',
      COSMOS_ENABLE_ENDPOINT_DISCOVERY: 'false',
      AZURE_STORAGE_FILES_CONTAINER: 'attachments',
      AZURE_STORAGE_AUTO_CREATE_CONTAINER: '0',
      FILE_MAX_SIZE_BYTES: '1048576',
    });

    expect(config.app.port).toBe(8080);
    expect(config.app.fileMaxSizeBytes).toBe(1_048_576);
    expect(config.storage).toMatchObject({ filesContainer: 'attachments', autoCreateContainer: false });
    expect(config.app.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
    expect(config.cosmos.enableEndpointDiscovery).toBe(false);
  });

  it('fails fast with a readable message when required variables are missing', () => {
    expect(() => loadConfig({})).toThrow(/COSMOS_ENDPOINT[\s\S]*COSMOS_KEY[\s\S]*AZURE_STORAGE_CONNECTION_STRING/);
  });

  it('rejects an invalid blob container name', () => {
    expect(() => loadConfig({ ...baseEnv, AZURE_STORAGE_FILES_CONTAINER: 'Task_Files' })).toThrow(
      /AZURE_STORAGE_FILES_CONTAINER must be a valid container name/,
    );
  });
});
