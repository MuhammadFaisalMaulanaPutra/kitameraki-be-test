// Deletes ALL tasks and the form-settings document of ONE organization (test data cleanup).
// Usage: node scripts/cleanup-org.mjs <organizationId>
import { readFileSync } from "node:fs";
import { CosmosClient } from "@azure/cosmos";

const org = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(org ?? "")) {
  console.error("Usage: node scripts/cleanup-org.mjs <organizationId (uuid)>");
  process.exit(1);
}
const conn = process.env.COSMOS_CONNECTION_STRING ?? JSON.parse(readFileSync("local.settings.json", "utf8")).Values.COSMOS_CONNECTION_STRING;
if (conn.includes("localhost")) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const db = new CosmosClient(conn).database("TaskApp");
// Query is scoped to a single partition (the org), so no other organization can be touched.
const { resources } = await db.container("Tasks").items
  .query({ query: "SELECT c.id FROM c WHERE c.organizationId = @org", parameters: [{ name: "@org", value: org }] }, { partitionKey: org })
  .fetchAll();
for (const { id } of resources) await db.container("Tasks").item(id, org).delete();
let settings = 0;
try { await db.container("FormSettings").item(org, org).delete(); settings = 1; } catch (e) { if (e.code !== 404) throw e; }
console.log(`cleanup ${org}: ${resources.length} task(s), ${settings} form-settings doc(s) deleted`);
