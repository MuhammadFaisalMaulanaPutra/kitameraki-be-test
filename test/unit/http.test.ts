import assert from "node:assert/strict";
import test from "node:test";
import { withErrorHandling } from "../../src/lib/http";

async function invoke(error: unknown) {
    const handler = withErrorHandling(async () => {
        throw error;
    });
    return handler({} as any, { error() {} } as any);
}

test("transient Cosmos statuses map to service unavailable", async () => {
    for (const status of [408, 429, 503]) {
        const response = await invoke({ code: status });
        assert.equal(response.status, 503);
        assert.equal((response as any).jsonBody.error.code, "SERVICE_UNAVAILABLE");
    }
});

test("ETag precondition failures map to conflict", async () => {
    const response = await invoke({ code: 412 });
    assert.equal(response.status, 409);
    assert.equal((response as any).jsonBody.error.code, "CONFLICT");
});
