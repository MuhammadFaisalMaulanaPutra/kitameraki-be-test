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

let tasksContainer: Promise<Container> | undefined;
let formSettingsContainer: Promise<Container> | undefined;

// Reused across invocations within the same function host instance so that
// each request doesn't pay the cost of establishing a new Cosmos connection
// or re-provisioning a container that already exists.
export function getTasksContainer(): Promise<Container> {
    if (!tasksContainer) {
        tasksContainer = getClient()
            .database(DATABASE_ID)
            .containers.createIfNotExists({ id: TASKS_CONTAINER_ID, partitionKey: "/organizationId" })
            .then(({ container }) => container);
    }
    return tasksContainer;
}

export function getFormSettingsContainer(): Promise<Container> {
    if (!formSettingsContainer) {
        formSettingsContainer = getClient()
            .database(DATABASE_ID)
            .containers.createIfNotExists({ id: FORM_SETTINGS_CONTAINER_ID, partitionKey: "/organizationId" })
            .then(({ container }) => container);
    }
    return formSettingsContainer;
}
