/**
 * Application Configuration
 * Validates required environment variables at startup
 */

/**
 * Validates that a required environment variable is set
 * @param varName - Name of the environment variable
 * @returns The environment variable value
 * @throws Error if variable is not set
 */
function getRequiredEnvVar(varName: string): string {
  const value = process.env[varName];

  if (!value || value.trim() === "") {
    throw new Error(
      `Required environment variable "${varName}" is not set. Please check your configuration.`
    );
  }

  return value;
}

/**
 * Application configuration object
 * Validates all required environment variables on load
 */
export class Config {
  static readonly COSMOS_ENDPOINT: string = (() => {
    const endpoint = getRequiredEnvVar("COSMOS_ENDPOINT");
    // Validate it's a valid URL
    try {
      new URL(endpoint);
      return endpoint;
    } catch {
      throw new Error(
        `COSMOS_ENDPOINT must be a valid URL. Got: ${endpoint}`
      );
    }
  })();

  static readonly COSMOS_REGIONS: string[] = (() => {
    const regions = process.env.COSMOS_REGIONS || "East US";
    return regions.split(",").map((r) => r.trim());
  })();

  static readonly APP_VERSION: string = process.env.APP_VERSION || "1.0.0";

  static readonly ENVIRONMENT: "development" | "production" = 
    (process.env.ENVIRONMENT as "development" | "production") || "development";

  static readonly DEBUG: boolean = process.env.DEBUG === "true";

  /**
   * Logs current configuration (without sensitive data)
   */
  static logConfiguration(): void {
    console.log(
      JSON.stringify(
        {
          environment: this.ENVIRONMENT,
          appVersion: this.APP_VERSION,
          cosmosRegions: this.COSMOS_REGIONS,
          debug: this.DEBUG,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }
}

// Validate config on module load
try {
  Config.logConfiguration();
} catch (error) {
  console.error("Configuration validation failed:", error);
  process.exit(1);
}
