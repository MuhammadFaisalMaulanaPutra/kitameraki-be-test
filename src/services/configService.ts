import { FormConfig } from "../models/task";
import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_DB_CONNECTION || "";
const client = new CosmosClient(connectionString);
const database = client.database("TaskApp");
const container = database.container("Tasks");

export const configService = {
    async getConfig(): Promise<FormConfig> {
        try {
            const { resource } = await container.item("FORM_CONFIG", "FORM_CONFIG").read();
            return resource as FormConfig;
        } catch (error: any) {
            throw new Error("Form config tidak ditemukan di database.");
        }
    },

    async updateConfig(newConfig: FormConfig): Promise<FormConfig> {
        const { resource } = await container.item("FORM_CONFIG", "FORM_CONFIG").replace(newConfig);
        return resource as FormConfig;
    }
};

