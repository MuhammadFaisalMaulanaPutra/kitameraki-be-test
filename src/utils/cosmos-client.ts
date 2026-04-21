import "reflect-metadata";
import { CosmosClient } from "@azure/cosmos";

export const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
})

export const database = cosmosClient.database(process.env.COSMOS_DB)
export const containers =  {
    tasks: database.container(process.env.COSMOS_TASK_CONTAINER),
    users: database.container(process.env.COSMOS_USER_CONTAINER),
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
    try {
        const { resource: account } = await cosmosClient.getDatabaseAccount();
        return {
            success: true,
            message: `Successfully connected to Cosmos DB`
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            message: `Failed to connect to Cosmos DB: ${errorMessage}`
        };
    }
}