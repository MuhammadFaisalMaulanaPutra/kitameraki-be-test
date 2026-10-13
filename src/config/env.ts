import * as fs from "fs";
import * as path from "path";

function loadLocalSettings(): void {
	if (process.env.COSMOS_CONNECTION_STRING) return;

	const settingsPath = path.resolve(process.cwd(), "local.settings.json");
	if (fs.existsSync(settingsPath)) {
		try {
			const content = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
			if (content.Values) {
				for (const [key, value] of Object.entries(content.Values)) {
					if (!process.env[key] && typeof value === "string") {
						process.env[key] = value;
					}
				}
			}
		} catch {
		}
	}

	const envPath = path.resolve(process.cwd(), ".env");
	if (fs.existsSync(envPath)) {
		try {
			const lines = fs.readFileSync(envPath, "utf-8").split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
					const [key, ...rest] = trimmed.split("=");
					const val = rest.join("=").replace(/^['"]|['"]$/g, "");
					if (!process.env[key.trim()]) {
						process.env[key.trim()] = val;
					}
				}
			}
		} catch {
		}
	}
}

loadLocalSettings();

export const env = {
	get COSMOS_CONNECTION_STRING(): string {
		return process.env.COSMOS_CONNECTION_STRING || "";
	},
	get COSMOS_DATABASE_NAME(): string {
		return process.env.COSMOS_DATABASE_NAME || "TaskApp";
	},
	get COSMOS_CONTAINER_NAME(): string {
		return process.env.COSMOS_CONTAINER_NAME || "Tasks";
	},
	get NODE_ENV(): string {
		return process.env.NODE_ENV || "development";
	},
};

