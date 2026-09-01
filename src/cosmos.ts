import { CosmosClient, Container } from "@azure/cosmos";

const databaseName = process.env.COSMOS_DB_DATABASE ?? "TaskApp";
const containerName = process.env.COSMOS_DB_CONTAINER ?? "Tasks";

let cosmosClient: CosmosClient | undefined;

function readEnv(keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
            return value;
        }
    }

    return undefined;
}

function getCosmosClient(): CosmosClient {
    const connectionString = readEnv([
        "COSMOS_DB_CONNECTION_STRING",
        "COSMOS_CONNECTION_STRING",
        "AzureCosmosDBConnectionString"
    ]);

    const endpoint = readEnv(["COSMOS_DB_ENDPOINT", "COSMOS_ENDPOINT"]);
    const key = readEnv(["COSMOS_DB_KEY", "COSMOS_KEY"]);

    if (!cosmosClient) {
        if (connectionString) {
            cosmosClient = new CosmosClient(connectionString);
        } else if (endpoint && key) {
            cosmosClient = new CosmosClient({ endpoint, key });
        } else {
            throw new Error(
                "Missing Cosmos DB settings. Provide COSMOS_DB_CONNECTION_STRING (or COSMOS_CONNECTION_STRING / AzureCosmosDBConnectionString), or set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY."
            );
        }
    }

    return cosmosClient;
}

export function getTasksContainer(): Container {
    return getCosmosClient().database(databaseName).container(containerName);
}
