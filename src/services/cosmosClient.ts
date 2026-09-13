import { Container, CosmosClient, Database } from "@azure/cosmos";
import { env } from "../config/env";

let client: CosmosClient | undefined;
let database: Database | undefined;

function getClient(): CosmosClient {
    if (!client) {
        client = new CosmosClient(env.cosmosConnectionString());
    }
    return client;
}

function getDatabase(): Database {
    if (!database) {
        database = getClient().database(env.cosmosDbName());
    }
    return database;
}

export function getTasksContainer(): Container {
    return getDatabase().container(env.tasksContainer());
}

export function getFormSettingsContainer(): Container {
    return getDatabase().container(env.formSettingsContainer());
}