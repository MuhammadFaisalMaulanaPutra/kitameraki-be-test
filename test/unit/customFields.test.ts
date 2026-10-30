import assert from "node:assert/strict";
import test from "node:test";
import { mergeCustomFields } from "../../src/lib/customFields";

test("custom field merge preserves untouched values", () => {
    assert.deepEqual(
        mergeCustomFields(
            { email: "a@b.com", notes: "old", meeting: "2026-11-01T10:00:00Z" },
            { notes: "new" }
        ),
        { email: "a@b.com", notes: "new", meeting: "2026-11-01T10:00:00Z" }
    );
});

test("custom field merge removes null keys", () => {
    assert.deepEqual(
        mergeCustomFields({ email: "a@b.com", notes: "old" }, { notes: null }),
        { email: "a@b.com" }
    );
});

test("custom field merge handles a task without existing values", () => {
    assert.deepEqual(mergeCustomFields(undefined, { notes: "first" }), { notes: "first" });
});

test("custom field merge does not mutate object prototypes", () => {
    const changes = JSON.parse('{"__proto__":"unsafe"}') as Record<string, string>;
    const merged = mergeCustomFields(undefined, changes);

    assert.equal(Object.getPrototypeOf(merged), Object.prototype);
    assert.equal(({} as Record<string, unknown>).unsafe, undefined);
});
