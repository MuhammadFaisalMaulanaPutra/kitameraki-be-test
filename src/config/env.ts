import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false', '1', '0']).transform((value) => value === 'true' || value === '1');

const commaSeparatedList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(7071),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  COSMOS_ENDPOINT: z.url({ error: 'COSMOS_ENDPOINT must be a valid URL' }),
  COSMOS_KEY: z.string().min(1, 'COSMOS_KEY is required'),
  COSMOS_DATABASE_ID: z.string().min(1).default('TaskApp'),
  COSMOS_TASKS_CONTAINER_ID: z.string().min(1).default('Tasks'),
  COSMOS_FORM_SETTINGS_CONTAINER_ID: z.string().min(1).default('FormSettings'),
  COSMOS_ENABLE_ENDPOINT_DISCOVERY: booleanString.default(true),
  COSMOS_AUTO_CREATE_RESOURCES: booleanString.default(true),

  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1, 'AZURE_STORAGE_CONNECTION_STRING is required'),
  AZURE_STORAGE_FILES_CONTAINER: z
    .string()
    .regex(
      /^(?!.*--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
      'AZURE_STORAGE_FILES_CONTAINER must be a valid container name (3-63 lowercase letters, digits or hyphens)',
    )
    .default('task-files'),
  AZURE_STORAGE_AUTO_CREATE_CONTAINER: booleanString.default(true),
  FILE_MAX_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880),

  CORS_ORIGINS: commaSeparatedList.default(['http://localhost:3000', 'http://localhost:5173']),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  JSON_BODY_LIMIT: z.string().default('100kb'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  trustProxy: number;
  corsOrigins: string[];
  rateLimit: { windowMs: number; max: number };
  jsonBodyLimit: string;
  /** Maximum size of an uploaded file (`POST /files`). */
  fileMaxSizeBytes: number;
}

export interface CosmosConfig {
  endpoint: string;
  key: string;
  databaseId: string;
  tasksContainerId: string;
  formSettingsContainerId: string;
  enableEndpointDiscovery: boolean;
  autoCreateResources: boolean;
}

/** Azure Blob Storage (files uploaded with the File picker). */
export interface StorageConfig {
  connectionString: string;
  filesContainer: string;
  autoCreateContainer: boolean;
}

export interface Config {
  app: AppConfig;
  cosmos: CosmosConfig;
  storage: StorageConfig;
}

/**
 * Reads and validates environment variables once at startup.
 * Fails fast with a readable message instead of crashing later on a missing secret.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const vars = parsed.data;

  return {
    app: {
      nodeEnv: vars.NODE_ENV,
      port: vars.PORT,
      trustProxy: vars.TRUST_PROXY,
      corsOrigins: vars.CORS_ORIGINS,
      rateLimit: { windowMs: vars.RATE_LIMIT_WINDOW_MS, max: vars.RATE_LIMIT_MAX },
      jsonBodyLimit: vars.JSON_BODY_LIMIT,
      fileMaxSizeBytes: vars.FILE_MAX_SIZE_BYTES,
    },
    cosmos: {
      endpoint: vars.COSMOS_ENDPOINT,
      key: vars.COSMOS_KEY,
      databaseId: vars.COSMOS_DATABASE_ID,
      tasksContainerId: vars.COSMOS_TASKS_CONTAINER_ID,
      formSettingsContainerId: vars.COSMOS_FORM_SETTINGS_CONTAINER_ID,
      enableEndpointDiscovery: vars.COSMOS_ENABLE_ENDPOINT_DISCOVERY,
      autoCreateResources: vars.COSMOS_AUTO_CREATE_RESOURCES,
    },
    storage: {
      connectionString: vars.AZURE_STORAGE_CONNECTION_STRING,
      filesContainer: vars.AZURE_STORAGE_FILES_CONTAINER,
      autoCreateContainer: vars.AZURE_STORAGE_AUTO_CREATE_CONTAINER,
    },
  };
}
