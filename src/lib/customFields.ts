export function mergeCustomFields(
    existing: Record<string, string> | undefined,
    changes: Record<string, string | null>
): Record<string, string> {
    const merged = new Map(Object.entries(existing ?? {}));

    for (const [fieldId, value] of Object.entries(changes)) {
        if (value === null) {
            merged.delete(fieldId);
        } else {
            merged.set(fieldId, value);
        }
    }

    return Object.fromEntries(merged);
}
