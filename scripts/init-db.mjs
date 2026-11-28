// Creates the database and containers if they do not exist yet (safe to run repeatedly).
// Usage: npm run db:init   (reads COSMOS_CONNECTION_STRING from env, or from local.settings.json)
import { readFileSync } from "node:fs";
import { CosmosClient } from "@azure/cosmos";

let conn = process.env.COSMOS_CONNECTION_STRING;
if (!conn) {
  try {
    conn = JSON.parse(readFileSync("local.settings.json", "utf8")).Values.COSMOS_CONNECTION_STRING;
  } catch {
    // fall through to the error below
  }
}
if (!conn) {
  console.error("FAIL: set COSMOS_CONNECTION_STRING or create local.settings.json");
  process.exit(1);
}
// The emulator uses a self-signed certificate; accept it only when pointing at localhost.
if (conn.includes("localhost")) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

try {
  const client = new CosmosClient(conn);
  const { database } = await client.databases.createIfNotExists({ id: "TaskApp" });
  for (const id of ["Tasks", "FormSettings"]) {
    // 400 RU/s is the minimum on real Azure and plenty for this app.
    const { container, statusCode } = await database.containers.createIfNotExists(
      { id, partitionKey: { paths: ["/organizationId"] } },
      { offerThroughput: 400 },
    );
    console.log(`${statusCode === 201 ? "created" : "exists "}  TaskApp/${container.id}`);
  }
  console.log("OK: database ready");
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
