/**
 * Centralised, validated access to environment configuration.
 *
 * Secrets (the Cosmos connection string) live in `local.settings.json` locally
 * and in Application Settings when deployed — never in source control.
 * Access is lazy so importing this module (e.g. from tests) never throws until
 * a value is actually needed.
 */

export interface CosmosConfig {
  connectionString: string;
  databaseName: string;
  tasksContainer: string;
  formSettingsContainer: string;
}

export interface AppConfig {
  cosmos: CosmosConfig;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) {
    cached = {
      cosmos: {
        connectionString: required('COSMOS_CONNECTION_STRING'),
        databaseName: process.env.COSMOS_DATABASE_NAME ?? 'TaskApp',
        tasksContainer: process.env.COSMOS_TASKS_CONTAINER ?? 'Tasks',
        formSettingsContainer: process.env.COSMOS_FORM_SETTINGS_CONTAINER ?? 'FormSettings',
      },
    };
  }
  return cached;
}
