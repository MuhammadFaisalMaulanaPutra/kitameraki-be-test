/**
 * System fields Cosmos DB adds to every stored document
 * (`_rid`, `_self`, `_etag`, `_attachments`, `_ts`). These are
 * implementation details of the database and should never be
 * returned to API clients.
 */
const COSMOS_INTERNAL_FIELDS = ['_rid', '_self', '_etag', '_attachments', '_ts'] as const;

/**
 * Returns a shallow copy of `resource` with all Cosmos DB internal
 * system fields removed. Safe to call on plain objects that don't
 * have them too (e.g. already-clean data), since it's a no-op for
 * any field that isn't present.
 */
export function stripCosmosMetadata<T extends object>(resource: T): T {
    const clone = { ...resource } as Record<string, unknown>;

    for (const field of COSMOS_INTERNAL_FIELDS) {
        delete clone[field];
    }

    return clone as T;
}
