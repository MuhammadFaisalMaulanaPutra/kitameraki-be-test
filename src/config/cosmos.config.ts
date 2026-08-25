import { CosmosClient } from '@azure/cosmos'

export const cosmosConfig = {
  databaseName: process.env.COSMOS_DATABASE_NAME ?? 'TaskApp',
  taskContainerName: process.env.COSMOS_TASKS_CONTAINER ?? 'Tasks',
  settingsContainerName: process.env.COSMOS_SETTINGS_CONTAINER ?? 'TaskFormSettings'
}

function createCosmosClient(): CosmosClient {
  const connectionString = process.env.COSMOS_CONNECTION_STRING
  const endpoint = process.env.COSMOS_ENDPOINT
  const key = process.env.COSMOS_KEY

  if (connectionString) return new CosmosClient(connectionString)
  if (endpoint && key) return new CosmosClient({ endpoint, key })
  throw new Error('Cosmos DB connection is not configured.')
}

export const cosmosClient = createCosmosClient()
