import { afterEach, describe, expect, it } from 'vitest';
import { getConfig, resetConfigForTests } from '../src/config';

const keys = [
  'AZURE_FUNCTIONS_ENVIRONMENT',
  'ORGANIZATION_ID',
  'COSMOS_ENDPOINT',
  'COSMOS_CONNECTION_STRING',
  'COSMOS_DATABASE_NAME',
  'COSMOS_TASKS_CONTAINER_NAME',
  'COSMOS_FORM_SETTINGS_CONTAINER_NAME',
  'ALLOWED_ORIGIN',
  'MAX_REQUEST_BODY_BYTES',
  'SLOW_COSMOS_OPERATION_MS',
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

const configureConnectionString = (): void => {
  process.env.AZURE_FUNCTIONS_ENVIRONMENT = 'Development';
  process.env.ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
  process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=http://localhost:8081/;AccountKey=local;';
  delete process.env.COSMOS_ENDPOINT;
};

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetConfigForTests();
});

describe('environment configuration', () => {
  it('parses defaults once and caches the immutable application configuration', () => {
    configureConnectionString();
    const first = getConfig();
    process.env.COSMOS_DATABASE_NAME = 'ChangedAfterStartup';

    expect(getConfig()).toBe(first);
    expect(first).toMatchObject({
      COSMOS_DATABASE_NAME: 'TaskApp',
      MAX_REQUEST_BODY_BYTES: 262144,
      SLOW_COSMOS_OPERATION_MS: 250,
    });
  });

  it('accepts endpoint credentials when no connection string is present', () => {
    process.env.ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
    process.env.COSMOS_ENDPOINT = 'https://example.documents.azure.com';
    delete process.env.COSMOS_CONNECTION_STRING;
    expect(getConfig().COSMOS_ENDPOINT).toBe('https://example.documents.azure.com');
  });

  it('requires exactly one Cosmos credential', () => {
    configureConnectionString();
    process.env.COSMOS_ENDPOINT = 'https://example.documents.azure.com';
    expect(() => getConfig()).toThrow(/exactly one/);

    resetConfigForTests();
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_CONNECTION_STRING;
    expect(() => getConfig()).toThrow(/exactly one/);
  });

  it('requires an exact URL origin and bounded technical limits', () => {
    configureConnectionString();
    process.env.ALLOWED_ORIGIN = '*';
    expect(() => getConfig()).toThrow();

    resetConfigForTests();
    process.env.ALLOWED_ORIGIN = 'http://localhost:5173';
    process.env.MAX_REQUEST_BODY_BYTES = '100';
    expect(() => getConfig()).toThrow();
  });

  it('rejects non-HTTPS origins, endpoints, and account keys in production', () => {
    configureConnectionString();
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = 'Production';
    process.env.ALLOWED_ORIGIN = 'https://tasks.example.com';
    expect(() => getConfig()).toThrow(/COSMOS_CONNECTION_STRING/);

    resetConfigForTests();
    delete process.env.COSMOS_CONNECTION_STRING;
    process.env.COSMOS_ENDPOINT = 'http://example.documents.azure.com';
    expect(() => getConfig()).toThrow(/COSMOS_ENDPOINT must use HTTPS/);

    resetConfigForTests();
    process.env.COSMOS_ENDPOINT = 'https://example.documents.azure.com';
    process.env.ALLOWED_ORIGIN = 'http://tasks.example.com';
    expect(() => getConfig()).toThrow(/ALLOWED_ORIGIN must use HTTPS/);

    resetConfigForTests();
    process.env.ALLOWED_ORIGIN = 'https://tasks.example.com';
    expect(getConfig()).toMatchObject({
      AZURE_FUNCTIONS_ENVIRONMENT: 'Production',
      COSMOS_ENDPOINT: 'https://example.documents.azure.com',
    });
  });
});
