import { CosmosClient } from "@azure/cosmos";
import { COSMOS_ENDPOINT } from "./config";
const { DefaultAzureCredential } = require("@azure/identity");

const cred = new DefaultAzureCredential();

export function getDefaultCosmosClient(): CosmosClient {
  return new CosmosClient({
    endpoint: COSMOS_ENDPOINT,
    aadCredentials: cred,
  });
}
