/** Cosmos SDK errors carry the HTTP status of the failed operation in `code`. */
export function isCosmosNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 404;
}

const COSMOS_SYSTEM_PROPERTIES = ['_rid', '_self', '_etag', '_attachments', '_ts'] as const;

/** Removes Cosmos DB metadata so internal storage details never leak into API responses. */
export function stripSystemProperties<T extends object>(resource: T): T {
  const clean = { ...resource } as Record<string, unknown>;
  for (const property of COSMOS_SYSTEM_PROPERTIES) delete clean[property];
  return clean as T;
}
