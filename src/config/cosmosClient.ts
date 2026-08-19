import { Container, CosmosClient, Database } from '@azure/cosmos';

const DATABASE_NAME = process.env.COSMOS_DATABASE_NAME ?? 'TaskApp';
const TASKS_CONTAINER_NAME = process.env.COSMOS_TASKS_CONTAINER ?? 'Tasks';
const FORM_SETTINGS_CONTAINER_NAME = process.env.COSMOS_FORM_SETTINGS_CONTAINER ?? 'FormSettings';

let client: CosmosClient | undefined;
let database: Database | undefined;
let tasksContainer: Container | undefined;
let formSettingsContainer: Container | undefined;

/**
 * Lazily creates and reuses a single CosmosClient instance for the
 * lifetime of the function app instance, instead of opening a new
 * client (and connection) on every single request.
 *
 * The connection string is read from an environment variable
 * (`COSMOS_CONNECTION_STRING`, set via `local.settings.json` locally
 * or Application Settings on Azure) and must never be hardcoded.
 */
function getClient(): CosmosClient {
    if (!client) {
        const connectionString = process.env.COSMOS_CONNECTION_STRING;

        if (!connectionString) {
            throw new Error(
                'Missing COSMOS_CONNECTION_STRING environment variable. ' +
                'Set it in local.settings.json for local development, or in ' +
                'the Function App Application Settings when deployed.'
            );
        }

        client = new CosmosClient(connectionString);
    }

    return client;
}

function getDatabase(): Database {
    if (!database) {
        database = getClient().database(DATABASE_NAME);
    }
    return database;
}

/**
 * Returns the shared Tasks container instance.
 */
export function getTasksContainer(): Container {
    if (!tasksContainer) {
        tasksContainer = getDatabase().container(TASKS_CONTAINER_NAME);
    }
    return tasksContainer;
}

/**
 * Returns the shared FormSettings container instance.
 * Partitioned by `/organizationId`, same as Tasks — one document per
 * organization holds that org's custom form field configuration.
 */
export function getFormSettingsContainer(): Container {
    if (!formSettingsContainer) {
        formSettingsContainer = getDatabase().container(FORM_SETTINGS_CONTAINER_NAME);
    }
    return formSettingsContainer;
}