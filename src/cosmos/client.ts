import { Container, CosmosClient } from "@azure/cosmos";

const DATABASE_ID = "TaskApp";
const TASKS_CONTAINER_ID = "Tasks";
const FORM_SETTINGS_CONTAINER_ID = "FormSettings";

let client: CosmosClient | undefined;

function getClient(): CosmosClient {
    if (!client) {
        const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error("COSMOS_DB_CONNECTION_STRING app setting is not configured");
        }
        client = new CosmosClient(connectionString);
    }
    return client;
}

let database: Promise<import("@azure/cosmos").Database> | undefined;
let tasksContainer: Promise<Container> | undefined;
let formSettingsContainer: Promise<Container> | undefined;

// The database itself is never provisioned by the emulator/account automatically,
// so it must be created before any container can be. Cached and self-healing on
// failure for the same reason as the containers below.
function getDatabase(): Promise<import("@azure/cosmos").Database> {
    if (!database) {
        database = getClient()
            .databases.createIfNotExists({ id: DATABASE_ID })
            .then(({ database }) => database)
            .catch((error) => {
                database = undefined;
                throw error;
            });
    }
    return database;
}

// Reused across invocations within the same function host instance so that
// each request doesn't pay the cost of establishing a new Cosmos connection
// or re-provisioning a container that already exists. If provisioning fails
// (e.g. Cosmos was unreachable), the cache is cleared so the next call retries
// instead of replaying the same failure forever.
export function getTasksContainer(): Promise<Container> {
    if (!tasksContainer) {
        tasksContainer = getDatabase()
            .then((db) => db.containers.createIfNotExists({ id: TASKS_CONTAINER_ID, partitionKey: "/organizationId" }))
            .then(({ container }) => container)
            .catch((error) => {
                tasksContainer = undefined;
                throw error;
            });
    }
    return tasksContainer;
}

export function getFormSettingsContainer(): Promise<Container> {
    if (!formSettingsContainer) {
        formSettingsContainer = getDatabase()
            .then((db) => db.containers.createIfNotExists({ id: FORM_SETTINGS_CONTAINER_ID, partitionKey: "/organizationId" }))
            .then(({ container }) => container)
            .catch((error) => {
                formSettingsContainer = undefined;
                throw error;
            });
    }
    return formSettingsContainer;
}
