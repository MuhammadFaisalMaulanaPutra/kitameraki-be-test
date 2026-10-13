import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  BulkDeleteTasksSchema,
  GetTasksQuerySchema,
} from "../src/schemas/task.schema.ts";
import { UpsertFormSettingSchema } from "../src/schemas/form-setting.schema.ts";
import {
  ok,
  badRequest,
  noContent,
  handleControllerError,
  SECURITY_HEADERS,
} from "../dist/src/utils/http-response.js";
import { normalizeTaskPayload } from "../src/utils/sanitizer.ts";
import { AppError } from "../dist/src/utils/errors.js";

const VALID_ORG_ID = "11111111-1111-1111-1111-111111111111";

describe("OWASP Top 10 Security Suite", () => {
  describe("A01 / A04 - Resource Exhaustion & DoS Limits", () => {
    test("should accept bulk delete with 50 task IDs", () => {
      const taskIds = Array.from({ length: 50 }, (_, i) =>
        `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`
      );
      const result = BulkDeleteTasksSchema.safeParse({
        organizationId: VALID_ORG_ID,
        taskIds: taskIds.join(","),
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.taskIds.length, 50);
      }
    });

    test("should reject bulk delete with more than 50 task IDs", () => {
      const taskIds = Array.from({ length: 51 }, (_, i) =>
        `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`
      );
      const result = BulkDeleteTasksSchema.safeParse({
        organizationId: VALID_ORG_ID,
        taskIds: taskIds.join(","),
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        assert.ok(
          errorMessages.some((m) => m.includes("Bulk delete cannot exceed 50 task IDs"))
        );
      }
    });

    test("should reject search query longer than 100 characters", () => {
      const longSearch = "a".repeat(101);
      const result = GetTasksQuerySchema.safeParse({
        organizationId: VALID_ORG_ID,
        search: longSearch,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        assert.ok(
          errorMessages.some((m) => m.includes("Search query must not exceed 100 characters"))
        );
      }
    });

    test("should accept search query within 100 characters", () => {
      const safeSearch = "a".repeat(100);
      const result = GetTasksQuerySchema.safeParse({
        organizationId: VALID_ORG_ID,
        search: safeSearch,
      });
      assert.equal(result.success, true);
    });

    test("should reject tags filter when more than 10 tags are provided", () => {
      const excessiveTags = Array.from({ length: 11 }, (_, i) => `tag${i}`).join(",");
      const result = GetTasksQuerySchema.safeParse({
        organizationId: VALID_ORG_ID,
        tags: excessiveTags,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        assert.ok(
          errorMessages.some((m) => m.includes("Cannot filter by more than 10 tags"))
        );
      }
    });

    test("should accept tags filter with 10 or fewer tags", () => {
      const safeTags = Array.from({ length: 10 }, (_, i) => `tag${i}`).join(",");
      const result = GetTasksQuerySchema.safeParse({
        organizationId: VALID_ORG_ID,
        tags: safeTags,
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.tags?.length, 10);
      }
    });

    test("should reject form settings with more than 100 components", () => {
      const excessiveComponents = Array.from({ length: 101 }, (_, i) => ({
        id: `field_${i}`,
        key: `key_${i}`,
        label: `Field ${i}`,
        type: "textfield" as const,
      }));
      const result = UpsertFormSettingSchema.safeParse({
        organizationId: VALID_ORG_ID,
        components: excessiveComponents,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        assert.ok(
          errorMessages.some((m) => m.includes("Form cannot exceed 100 components"))
        );
      }
    });
  });

  describe("A03 / A08 - Prototype Pollution & Input Sanitization", () => {
    test("should sanitize and strip dangerous prototype pollution keys", () => {
      const maliciousPayload = JSON.parse(
        '{"title":"Clean Task","__proto__":{"polluted":"yes"},"constructor":{"isAdmin":true},"customFields":{"prototype":{"bad":true},"theme":"dark"}}'
      );

      const normalized = normalizeTaskPayload(maliciousPayload, VALID_ORG_ID);

      assert.equal(({} as any).polluted, undefined);
      assert.equal(Object.prototype.hasOwnProperty("polluted"), false);

      assert.equal(Object.hasOwn(normalized, "__proto__"), false);
      assert.equal(Object.hasOwn(normalized, "constructor"), false);
      assert.equal(Object.hasOwn(normalized, "prototype"), false);
      assert.equal(
        Object.hasOwn((normalized as any).customFields || {}, "prototype"),
        false
      );

      assert.equal(normalized.title, "Clean Task");
      assert.equal((normalized as any).customFields?.theme, "dark");
    });
  });

  describe("A05 - Security Headers & Information Disclosure", () => {
    test("should attach all required OWASP security headers to ok responses", () => {
      const res = ok({ hello: "world" });
      assert.ok(res.headers);
      assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
      assert.equal(res.headers["X-Frame-Options"], "DENY");
      assert.equal(
        res.headers["Strict-Transport-Security"],
        "max-age=31536000; includeSubDomains"
      );
      assert.equal(
        res.headers["Content-Security-Policy"],
        "default-src 'none'; frame-ancestors 'none'"
      );
      assert.equal(
        res.headers["Cache-Control"],
        "no-store, no-cache, must-revalidate"
      );
    });

    test("should attach security headers to noContent responses", () => {
      const res = noContent();
      assert.ok(res.headers);
      assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
      assert.equal(res.headers["X-Frame-Options"], "DENY");
      assert.equal(res.status, 204);
    });

    test("should attach security headers to badRequest responses", () => {
      const res = badRequest("Invalid request");
      assert.ok(res.headers);
      assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
      assert.equal(res.status, 400);
    });

    test("should preserve AppError message for known business/domain errors", () => {
      const appErr = new AppError("Organization not found", 404, "NOT_FOUND");
      const res = handleControllerError(appErr);
      assert.equal(res.status, 404);
      const body = res.jsonBody as any;
      assert.equal(body.error.code, "NOT_FOUND");
      assert.equal(body.error.message, "Organization not found");
    });

    test("should mask raw 500 error messages and supply requestId in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const internalErr = new Error("Cosmos DB connection failed at secret-endpoint.internal:8081");
        const res = handleControllerError(internalErr);

        assert.equal(res.status, 500);
        const body = res.jsonBody as any;
        assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal(body.error.message, "An unexpected internal server error occurred");
        assert.ok(typeof body.error.requestId === "string" && body.error.requestId.length > 0);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test("should preserve descriptive error message for debugging in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      try {
        const internalErr = new Error("Detailed development debug error");
        const res = handleControllerError(internalErr);

        assert.equal(res.status, 500);
        const body = res.jsonBody as any;
        assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal(body.error.message, "Detailed development debug error");
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
