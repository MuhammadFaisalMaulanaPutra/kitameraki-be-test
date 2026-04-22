import * as dotenv from "dotenv";
dotenv.config();

import { CosmosClient } from "@azure/cosmos";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

console.log("COSMOS:", process.env.COSMOS_DB_CONNECTION); // debug

export const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION!);