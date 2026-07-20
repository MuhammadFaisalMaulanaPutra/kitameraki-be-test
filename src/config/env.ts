import { z } from "zod";

/**
 * Zod schema untuk validasi environment variables.
 * Dipanggil saat startup — jika env tidak valid, app gagal start
 * dengan pesan error yang jelas.
 */
const envSchema = z.object({
  COSMOS_DB_CONNECTION_STRING: z
    .string({ required_error: "COSMOS_DB_CONNECTION_STRING is required" })
    .min(1, "COSMOS_DB_CONNECTION_STRING cannot be empty"),
  COSMOS_DATABASE_NAME: z
    .string({ required_error: "COSMOS_DATABASE_NAME is required" })
    .min(1, "COSMOS_DATABASE_NAME cannot be empty"),
  COSMOS_TASKS_CONTAINER: z
    .string({ required_error: "COSMOS_TASKS_CONTAINER is required" })
    .min(1, "COSMOS_TASKS_CONTAINER cannot be empty"),
  COSMOS_FORM_SETTINGS_CONTAINER: z
    .string()
    .min(1, "COSMOS_FORM_SETTINGS_CONTAINER cannot be empty")
    .default("FormSettings"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

/**
 * Parse dan validasi environment variables.
 * Hasilnya di-cache agar hanya diparse sekali.
 */
export function getEnvConfig(): EnvConfig {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `❌ Environment variable validation failed:\n${errors}`
    );
  }

  _config = result.data;
  return _config;
}
