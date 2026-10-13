export const STANDARD_TASK_KEYS = new Set([
  "id",
  "organizationId",
  "title",
  "description",
  "dueDate",
  "priority",
  "status",
  "tags",
  "customFields",
]);

export const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeKey(key: string): boolean {
  return !FORBIDDEN_KEYS.has(key);
}

export function sanitizeObject(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {};
  }
  const clean: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSafeKey(key)) {
      clean[key] = value;
    }
  }
  return { ...clean };
}

export function normalizeTaskPayload(
  rawBody: Record<string, unknown>,
  fallbackOrgId?: string | null
): Record<string, unknown> {
  const extraFields: Record<string, unknown> = Object.create(null);
  const standardFields: Record<string, unknown> = Object.create(null);

  for (const [key, value] of Object.entries(rawBody || {})) {
    if (!isSafeKey(key)) {
      continue;
    }
    if (STANDARD_TASK_KEYS.has(key)) {
      standardFields[key] = value;
    } else {
      extraFields[key] = value;
    }
  }

  const existingCustom = sanitizeObject(rawBody?.customFields);
  const mergedCustom = { ...extraFields, ...existingCustom };

  return {
    ...standardFields,
    ...(fallbackOrgId && !standardFields.organizationId ? { organizationId: fallbackOrgId } : {}),
    ...(Object.keys(mergedCustom).length > 0 ? { customFields: mergedCustom } : {}),
  };
}
