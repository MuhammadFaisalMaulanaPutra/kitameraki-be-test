import { CosmosClient, Container, Database } from "@azure/cosmos";
import { env } from "@/config/env";
import { COSMOS_CONFIG } from "@/config/cosmos.config";

let _client: CosmosClient | null = null;
let _database: Database | null = null;
let _container: Container | null = null;

export function getCosmosClient(): CosmosClient {
	if (!_client) {
		let connectionString = (env.COSMOS_CONNECTION_STRING || process.env.COSMOS_CONNECTION_STRING || "").trim();
		if ((connectionString.startsWith('"') && connectionString.endsWith('"')) ||
		    (connectionString.startsWith("'") && connectionString.endsWith("'"))) {
			connectionString = connectionString.slice(1, -1).trim();
		}

		if (!connectionString) {
			throw new Error(
				"COSMOS_CONNECTION_STRING is missing. Please define it in local.settings.json or environment variables."
			);
		}

		if (connectionString.startsWith("http://") || connectionString.startsWith("https://")) {
			connectionString = `AccountEndpoint=${connectionString}`;
		}

		try {
			_client = new CosmosClient(connectionString);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`Failed to initialize CosmosClient with connection string [${connectionString}]: ${message}`);
		}
	}
	return _client;
}

export function getTasksDatabase(): Database {
	if (!_database) {
		const client = getCosmosClient();
		const dbName = env.COSMOS_DATABASE_NAME || COSMOS_CONFIG.DATABASE_ID;
		_database = client.database(dbName);
	}
	return _database;
}

export function getTasksContainer(): Container {
	if (!_container) {
		const database = getTasksDatabase();
		const containerName = env.COSMOS_CONTAINER_NAME || COSMOS_CONFIG.CONTAINERS.TASKS;
		_container = database.container(containerName);
	}
	return _container;
}

export const tasksContainer = new Proxy({} as Container, {
	get(_target, prop) {
		const container = getTasksContainer();
		const value = Reflect.get(container, prop);
		return typeof value === "function" ? value.bind(container) : value;
	},
});

let _formSettingsContainer: Container | null = null;

export function getFormSettingsContainer(): Container {
	if (!_formSettingsContainer) {
		const database = getTasksDatabase();
		const containerName = COSMOS_CONFIG.CONTAINERS.FORM_SETTINGS;
		_formSettingsContainer = database.container(containerName);
	}
	return _formSettingsContainer;
}

export const formSettingsContainer = new Proxy({} as Container, {
	get(_target, prop) {
		const container = getFormSettingsContainer();
		const value = Reflect.get(container, prop);
		return typeof value === "function" ? value.bind(container) : value;
	},
});

let _containersEnsured = false;

export async function ensureContainersExist(): Promise<void> {
	if (_containersEnsured) return;

	const client = getCosmosClient();
	const dbName = env.COSMOS_DATABASE_NAME || COSMOS_CONFIG.DATABASE_ID;
	const { database } = await client.databases.createIfNotExists({ id: dbName });

	await database.containers.createIfNotExists({
		id: COSMOS_CONFIG.CONTAINERS.TASKS,
		partitionKey: { paths: [COSMOS_CONFIG.PARTITION_KEYS.TASKS] },
	});

	await database.containers.createIfNotExists({
		id: COSMOS_CONFIG.CONTAINERS.FORM_SETTINGS,
		partitionKey: { paths: [COSMOS_CONFIG.PARTITION_KEYS.FORM_SETTINGS] },
	});

	_containersEnsured = true;
}


