import { SqlQuerySpec } from "@azure/cosmos";
import { getFormSettingsContainer } from "./cosmosClient";
import {
  FormSetting,
  UpdateFormSettingInput,
} from "../models/formSetting.model";

/**
 * Service layer untuk operasi CRUD pada Form Settings.
 * Menggunakan singleton pattern — satu dokumen konfigurasi per organization.
 * Document id diset sama dengan organizationId untuk lookup cepat.
 */
export class FormSettingService {
  /**
   * Mengambil form settings untuk suatu organization.
   * Mengembalikan null jika belum pernah dikonfigurasi.
   */
  static async getFormSettings(
    organizationId: string
  ): Promise<FormSetting | null> {
    const container = getFormSettingsContainer();

    // Parameterized query — AMAN dari injection
    const querySpec: SqlQuerySpec = {
      query: "SELECT * FROM c WHERE c.organizationId = @orgId",
      parameters: [{ name: "@orgId", value: organizationId }],
    };

    const { resources } = await container.items
      .query<FormSetting>(querySpec)
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * Membuat atau memperbarui form settings (upsert).
   * Seluruh array fields di-replace (bukan partial update).
   */
  static async upsertFormSettings(
    organizationId: string,
    data: UpdateFormSettingInput
  ): Promise<FormSetting> {
    const container = getFormSettingsContainer();

    const doc: FormSetting = {
      id: organizationId, // singleton: id === organizationId
      organizationId,
      fields: data.fields,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.items.upsert<FormSetting>(doc);
    return resource!;
  }
}
