import { CosmosClient, ConsistencyLevel } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { Config } from "./config";
import { DB_CONFIG } from "./constants";

let cosmosClient: CosmosClient | null = null;
let isInitialized = false;

/**
 * Gets or creates Cosmos DB client singleton
 * @returns Cosmos DB client instance
 */
export function getDefaultCosmosClient(): CosmosClient {
  if (cosmosClient) {
    return cosmosClient;
  }

  const commonSettings = {
    endpoint: Config.COSMOS_ENDPOINT,
    consistencyLevel: ConsistencyLevel.Session,
    userAgentSuffix: `TaskApp/${Config.APP_VERSION}`,
  };

  // Check if COSMOS_KEY is set (for local development/emulator)
  const cosmosKey = process.env.COSMOS_KEY;

  if (cosmosKey) {
    // allow unauthorized cert in local development
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // Use key-based authentication for local development/emulator
    cosmosClient = new CosmosClient({
      key: cosmosKey,
      ...commonSettings,
    });
  } else {
    // Use Azure AD authentication for production
    const credential = new DefaultAzureCredential();
    cosmosClient = new CosmosClient({
      aadCredentials: credential,
      ...commonSettings,
    });
  }

  return cosmosClient;
}

/**
 * Initializes the database and container if they don't exist
 * This is called automatically on first use
 */
async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  const client = getDefaultCosmosClient();

  try {
    // Check if database exists, create if not
    const { database } = await client.databases.createIfNotExists({
      id: DB_CONFIG.DATABASE_NAME,
    });

    // Check if container exists, create if not
    await database.containers.createIfNotExists({
      id: DB_CONFIG.CONTAINER_NAME,
      partitionKey: { paths: ["/organizationId"] },
    });

    isInitialized = true;
    console.log(`Database "${DB_CONFIG.DATABASE_NAME}" and container "${DB_CONFIG.CONTAINER_NAME}" initialized successfully.`);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Gets the Cosmos DB client with automatic database initialization
 * @returns Cosmos DB client instance
 */
export async function getInitializedCosmosClient(): Promise<CosmosClient> {
  const client = getDefaultCosmosClient();
  await initializeDatabase();
  return client;
}

/**
 * Graceful shutdown for Function App lifecycle
 * @returns Promise that resolves when client is disposed
 */
export async function closeCosmosClient(): Promise<void> {
  if (cosmosClient) {
    await cosmosClient.dispose();
    cosmosClient = null;
    isInitialized = false;
  }
}
