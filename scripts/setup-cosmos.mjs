/**
 * One-command local database bootstrap.
 *
 *   npm run setup:db
 *
 * Reads the Cosmos connection string from local.settings.json and creates the
 * database + containers (partitioned by /organizationId) if they don't exist.
 * Safe to run repeatedly. Keeps createIfNotExists out of the request path.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CosmosClient } from '@azure/cosmos';

const here = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(here, '..', 'local.settings.json');

let values;
try {
  values = JSON.parse(readFileSync(settingsPath, 'utf8')).Values ?? {};
} catch {
  console.error('Could not read local.settings.json. Copy local.settings.json.example first.');
  process.exit(1);
}

const connectionString = values.COSMOS_CONNECTION_STRING;
if (!connectionString) {
  console.error('COSMOS_CONNECTION_STRING is missing from local.settings.json.');
  process.exit(1);
}

// The Cosmos emulator serves a self-signed certificate over HTTPS.
if (values.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const databaseName = values.COSMOS_DATABASE_NAME ?? 'TaskApp';
const containers = [
  values.COSMOS_TASKS_CONTAINER ?? 'Tasks',
  values.COSMOS_FORM_SETTINGS_CONTAINER ?? 'FormSettings',
];

const client = new CosmosClient(connectionString);

const { database } = await client.databases.createIfNotExists({ id: databaseName });
console.log(`✓ database "${databaseName}" ready`);

for (const id of containers) {
  await database.containers.createIfNotExists({ id, partitionKey: { paths: ['/organizationId'] } });
  console.log(`✓ container "${id}" ready (partition key: /organizationId)`);
}

console.log('\nDone. Cosmos DB is ready for the Task Management API.');
