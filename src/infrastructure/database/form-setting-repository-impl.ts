import { Container } from "@azure/cosmos";
import { FormSettingRepository } from "../../domain/repositories/form-setting-repository";
import { FormSetting } from "../../domain/form-setting";

export class FormSettingRepositoryImpl implements FormSettingRepository {
    constructor(private container: Container) {}

    async create(formSetting: FormSetting): Promise<FormSetting> {
        try {
            const { resource } = await this.container.items.create(formSetting);
            return resource as FormSetting;
        } catch (error) {
            console.error('Error add new form setting:', error);
            throw error;
        }
    }

    async findByOrganizationId(organizationId: string): Promise<FormSetting | null> {
        try {
            const query = {
                query: "SELECT * FROM c"
            }

            const { resources } = await this.container.items.query(query, {
                partitionKey: organizationId
            }).fetchNext();
            
            if (resources.length == 0)
                return null

            return resources[0];
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            console.error('Error finding form setting by ID:', error);
            throw error;
        }
    }

    async update(formSetting: FormSetting): Promise<FormSetting> {
        try {
            const result = await this.container.item(formSetting.id, formSetting.organizationId).replace(formSetting);
            return result.resource as FormSetting;
        } catch (error) {
            if (error.code === 404) {
                return null;
            }
            console.error('Error update form setting by ID:', error);
            throw error;
        }
    }
}