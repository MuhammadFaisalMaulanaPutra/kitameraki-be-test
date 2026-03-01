import { CosmosClient, Container } from "@azure/cosmos";

const COSMOS_CLIENT_OPTIONS = {
    connectionPolicy: {
        requestTimeout: 5000
    },
    retryOptions: {
        maxRetryAttemptCount: 1,
        fixedRetryIntervalInMilliseconds: 500,
        maxWaitTimeInSeconds: 5
    }
};

type CosmosCredentialMode = "connectionString" | "endpointKey";

interface CosmosConfig {
    credentialMode: CosmosCredentialMode;
    endpoint: string;
    key?: string;
    connectionString?: string;
    databaseName: string;
    defaultContainerName: string;
}

interface CosmosDiagnostics {
    endpoint: string;
    credentialMode: CosmosCredentialMode;
    hasConnectionString: boolean;
    hasEndpoint: boolean;
    hasKey: boolean;
    databaseName: string;
    defaultContainerName: string;
}

function readEnv(name: string): string | undefined {
    const value = process.env[name];
    if (!value) {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function readAnyEnv(...names: string[]): string | undefined {
    for (const name of names) {
        const value = readEnv(name);
        if (value) {
            return value;
        }
    }

    return undefined;
}

function parseEndpointFromConnectionString(connectionString: string): string | undefined {
    const segment = connectionString
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.toLowerCase().startsWith("accountendpoint="));

    if (!segment) {
        return undefined;
    }

    const [, endpoint] = segment.split("=", 2);
    return endpoint?.trim();
}

let cachedConfig: CosmosConfig | undefined;
let clientInstance: CosmosClient | undefined;

function getCosmosConfig(): CosmosConfig {
    if (cachedConfig) {
        return cachedConfig;
    }

    const connectionString = readAnyEnv("COSMOS_DB_CONNECTION_STRING", "CosmosDBConnection");
    const endpoint = readAnyEnv("COSMOS_DB_ENDPOINT", "CosmosDBEndpoint");
    const key = readAnyEnv("COSMOS_DB_KEY", "CosmosDBKey");
    const databaseName = readAnyEnv("COSMOS_DB_NAME") ?? "TaskApp";
    const defaultContainerName = readAnyEnv("COSMOS_CONTAINER_NAME") ?? "Tasks";

    if (connectionString) {
        const endpointFromConnectionString = parseEndpointFromConnectionString(connectionString);
        if (!endpointFromConnectionString) {
            throw new Error(
                "[cosmos] COSMOS_DB_CONNECTION_STRING is set but missing AccountEndpoint segment."
            );
        }

        cachedConfig = {
            credentialMode: "connectionString",
            connectionString,
            endpoint: endpointFromConnectionString,
            databaseName,
            defaultContainerName
        };
    } else if (endpoint && key) {
        cachedConfig = {
            credentialMode: "endpointKey",
            endpoint,
            key,
            databaseName,
            defaultContainerName
        };
    } else {
        const missing: string[] = [];
        if (!endpoint) {
            missing.push("COSMOS_DB_ENDPOINT");
        }
        if (!key) {
            missing.push("COSMOS_DB_KEY");
        }

        throw new Error(
            `[cosmos] Missing Cosmos DB credentials. Configure COSMOS_DB_CONNECTION_STRING or both ${missing.join(
                " + "
            )}.`
        );
    }

    const diagnostics: CosmosDiagnostics = {
        endpoint: cachedConfig.endpoint,
        credentialMode: cachedConfig.credentialMode,
        hasConnectionString: Boolean(connectionString),
        hasEndpoint: Boolean(endpoint),
        hasKey: Boolean(key),
        databaseName: cachedConfig.databaseName,
        defaultContainerName: cachedConfig.defaultContainerName
    };

    console.log("[cosmos] Configuration loaded", diagnostics);
    return cachedConfig;
}

export function getCosmosDiagnostics(): CosmosDiagnostics {
    const config = getCosmosConfig();
    return {
        endpoint: config.endpoint,
        credentialMode: config.credentialMode,
        hasConnectionString: Boolean(config.connectionString),
        hasEndpoint: true,
        hasKey: Boolean(config.key),
        databaseName: config.databaseName,
        defaultContainerName: config.defaultContainerName
    };
}

export function getCosmosClient(): CosmosClient {
    if (clientInstance) {
        return clientInstance;
    }

    const config = getCosmosConfig();
    try {
        clientInstance =
            config.credentialMode === "connectionString"
                ? new CosmosClient(config.connectionString!)
                : new CosmosClient({
                      endpoint: config.endpoint,
                      key: config.key!,
                      ...COSMOS_CLIENT_OPTIONS
                  });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
            `[cosmos] Failed to initialize CosmosClient for endpoint "${config.endpoint}". ${message}`
        );
    }

    return clientInstance;
}

export const COSMOS_DB_NAME = readAnyEnv("COSMOS_DB_NAME") ?? "TaskApp";
export const COSMOS_CONTAINER_NAME = readAnyEnv("COSMOS_CONTAINER_NAME") ?? "Tasks";
let containerPromises: Record<string, Promise<Container>> = {};

export async function ensureContainer(containerName: string): Promise<Container> {
    if (containerPromises[containerName]) {
        return containerPromises[containerName];
    }

    containerPromises[containerName] = (async () => {
        const client = getCosmosClient();
        const { databaseName } = getCosmosConfig();
        const { database } = await client.databases.createIfNotExists({ id: databaseName });
        const { container } = await database.containers.createIfNotExists({
            id: containerName,
            partitionKey: { paths: ["/organizationId"] }
        });
        return container;
    })();

    return containerPromises[containerName];
}
