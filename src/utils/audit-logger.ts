import { InvocationContext } from "@azure/functions";

export type SecurityEventType =
  | "AUTH_ANONYMOUS_ACCESS"
  | "BULK_DELETE_TRIGGERED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "VALIDATION_FAILED"
  | "RATE_LIMIT_WARNING"
  | "SUSPICIOUS_PAYLOAD";

export interface SecurityAuditEntry {
  timestamp: string;
  eventType: SecurityEventType;
  organizationId?: string | null;
  actor?: string;
  details?: Record<string, unknown>;
}

export function logSecurityEvent(
  eventType: SecurityEventType,
  meta: {
    organizationId?: string | null;
    actor?: string;
    context?: InvocationContext;
    details?: Record<string, unknown>;
  }
): void {
  const entry: SecurityAuditEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    organizationId: meta.organizationId ?? null,
    actor: meta.actor ?? "anonymous",
    details: meta.details ? sanitizeAuditDetails(meta.details) : undefined,
  };

  const formatted = `[SECURITY_AUDIT] [${entry.eventType}] org=${entry.organizationId ?? "unknown"} actor=${entry.actor} details=${JSON.stringify(entry.details ?? {})}`;

  if (meta.context) {
    meta.context.log(formatted);
  } else {
    console.log(formatted);
  }
}

const SENSITIVE_KEY_PATTERNS = [/password/i, /secret/i, /key/i, /token/i, /auth/i, /credential/i];

function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
