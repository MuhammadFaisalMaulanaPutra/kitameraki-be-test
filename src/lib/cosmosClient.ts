/**
 * @file cosmosClient.ts
 * @description Singleton factory for the Azure Cosmos DB client and container reference.
 *
 * Instantiating CosmosClient inside each Azure Function handler is an anti-pattern:
 * it wastes connection-pool resources and slows cold starts. By exporting a single
 * shared instance, all function handlers share the same underlying HTTP connection
 * pool across warm invocations, which is the recommended approach by the Azure SDK team.
 *
 * Configuration is read exclusively from environment variables so that no secrets
 * ever appear in source code.
 */

import { CosmosClient, Container, Database } from "@azure/cosmos";

/**
 * Validates that a required environment variable is present.
 * Throws a descriptive error at startup rather than producing a cryptic
 * runtime failure deep inside a handler.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: "${name}". ` +
        `Ensure it is set in local.settings.json (locally) or in the Azure Function App configuration (cloud).`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

const endpoint = requireEnv("COSMOS_ENDPOINT");
const key = requireEnv("COSMOS_KEY");
const databaseName = requireEnv("DATABASE_NAME");
const containerName = requireEnv("COSMOS_CONTAINER_NAME");

/**
 * Shared CosmosDB client instance.
 * Reused across all warm function invocations — do not re-create inside handlers.
 */
const cosmosClient = new CosmosClient({ endpoint, key });

/**
 * Reference to the target database.
 * Accessing `.database()` is a local reference operation — no network call.
 */
const database: Database = cosmosClient.database(databaseName);

/**
 * Reference to the target container.
 * Accessing `.container()` is a local reference operation — no network call.
 */
const container: Container = database.container(containerName);

export { cosmosClient, database, container };
