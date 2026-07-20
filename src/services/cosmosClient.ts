import { CosmosClient, Container } from "@azure/cosmos";
import { getEnvConfig } from "../config/env";

let _client: CosmosClient | null = null;

/**
 * Singleton CosmosClient.
 * Client di-reuse antar request untuk efisiensi koneksi.
 */
function getCosmosClient(): CosmosClient {
  if (!_client) {
    const config = getEnvConfig();
    _client = new CosmosClient(config.COSMOS_DB_CONNECTION_STRING);
  }
  return _client;
}

/**
 * Mendapatkan reference ke Tasks container.
 * Database dan container name diambil dari environment variables
 * (bukan hardcoded).
 */
export function getTasksContainer(): Container {
  const config = getEnvConfig();
  return getCosmosClient()
    .database(config.COSMOS_DATABASE_NAME)
    .container(config.COSMOS_TASKS_CONTAINER);
}
