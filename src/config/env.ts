function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const env = {
    cosmosConnectionString: () => getRequiredEnv("COSMOS_DB_CONNECTION_STRING"),
    cosmosDbName: () => getRequiredEnv("COSMOS_DB_NAME"),
    tasksContainer: () => getRequiredEnv("COSMOS_TASKS_CONTAINER"),
    formSettingsContainer: () => getRequiredEnv("COSMOS_FORM_SETTINGS_CONTAINER"),
};