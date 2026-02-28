import { Container } from "@azure/cosmos";
import { getContainer } from "../../../core/database/cosmos";
import { FormSettingsSchema } from "../models/formSettings";
import { FormSettings } from "../types/FormSettings";

export class FormSettingsRepository {
  private container: Container;

  constructor() {
    this.container = getContainer("Settings");
  }

  async findByOrganizationId(organizationId: string): Promise<FormSettings | null> {
    const id = `settings_${organizationId}`;
    try {
      const { resource } = await this.container.item(id, organizationId).read<FormSettings>();
      
      if (!resource) {
        return null;
      }
      
      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(settingsData: FormSettings): Promise<FormSettings> {
    const validatedData = FormSettingsSchema.parse(settingsData);
    const { resource } = await this.container.items.upsert<FormSettings>(validatedData);
    
    if (!resource) {
      throw new Error(`Failed to save FormSettings for organization: ${settingsData.organizationId}`);
    }
    
    return resource;
  }
}

export const formSettingsRepository = new FormSettingsRepository();
