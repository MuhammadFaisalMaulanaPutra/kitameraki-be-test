import "reflect-metadata";
import { CosmosClient } from "@azure/cosmos";

export const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
})

export const database = cosmosClient.database(process.env.COSMOS_DB)
export const containers =  {
    tasks: database.container(process.env.COSMOS_TASK_CONTAINER)
}