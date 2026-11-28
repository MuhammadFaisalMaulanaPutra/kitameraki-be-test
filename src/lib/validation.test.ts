// Unit tests for the pure validators. Run with: npm test
// Uses Node's built-in test runner, so no extra test framework is installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpError, isUuid } from "./http";
import { defaultRows } from "./defaults";
import { validateBulkIds, validateFormRows, validateListQuery, validateTaskInput } from "./validation";

// Helper: asserts the call throws HttpError 400, optionally matching the message.
const rejects = (fn: () => unknown, msg?: RegExp) =>
  assert.throws(fn, (e: unknown) => e instanceof HttpError && e.status === 400 && (!msg || msg.test(e.message)));

test("valid task is accepted and trimmed", () => {
  const out = validateTaskInput({ title: "  Hello ", tags: ["a", "a", "b"], status: "todo" }, false);
  assert.equal(out.title, "Hello");
  assert.deepEqual(out.tags, ["a", "b"]); // duplicates removed
});
test("title required on create", () => rejects(() => validateTaskInput({}, false), /title is required/));
test("title longer than 100 rejected", () => rejects(() => validateTaskInput({ title: "x".repeat(101) }, false)));
test("bad status enum rejected", () => rejects(() => validateTaskInput({ title: "a", status: "done" }, false), /status/));
test("client-sent id rejected", () => rejects(() => validateTaskInput({ title: "a", id: "x" }, false), /forbidden/));
test("client-sent organizationId rejected", () => rejects(() => validateTaskInput({ title: "a", organizationId: "x" }, false)));
test("unknown key rejected", () => rejects(() => validateTaskInput({ title: "a", hacker: 1 }, false)));
test("empty PATCH rejected", () => rejects(() => validateTaskInput({}, true), /at least one/));
test("PATCH allows null to clear description", () => assert.equal(validateTaskInput({ description: null }, true).description, null));
test("bad dueDate rejected", () => rejects(() => validateTaskInput({ title: "a", dueDate: "tomorrow-ish" }, false)));
test("customFields key pattern enforced", () => rejects(() => validateTaskInput({ title: "a", customFields: { "bad key!": "x" } }, false)));

test("isUuid", () => {
  assert.ok(isUuid("11111111-1111-4111-8111-111111111111"));
  assert.ok(!isUuid("abc"));
  assert.ok(!isUuid("' OR 1=1 --"));
});

test("list query defaults and bounds", () => {
  assert.deepEqual(validateListQuery(new URLSearchParams()), { page: 1, pageSize: 10 });
  rejects(() => validateListQuery(new URLSearchParams("pageSize=1000")));
  rejects(() => validateListQuery(new URLSearchParams("page=0")));
  rejects(() => validateListQuery(new URLSearchParams("status=nope")));
});

test("bulk ids", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(validateBulkIds({ ids: [id, id] }), [id]); // deduped
  rejects(() => validateBulkIds({ ids: [] }));
  rejects(() => validateBulkIds({ ids: ["nope"] }));
});

test("default form settings are valid", () => assert.equal(validateFormRows({ rows: defaultRows() }).length, 4));

test("form without a built-in field is rejected", () => {
  const rows = defaultRows().filter((r) => r.id !== "row-title");
  rejects(() => validateFormRows({ rows }), /cannot be removed/);
});
test("3 fields in a row rejected", () => {
  const rows = defaultRows();
  rows[3].fields.push({ id: "f_x", label: "X", type: "text" });
  rejects(() => validateFormRows({ rows }), /1-2 fields/);
});
test("duplicate field ids rejected", () => {
  const rows = defaultRows();
  rows.push({ id: "r9", fields: [{ id: "title", label: "dup", type: "text" }] });
  rejects(() => validateFormRows({ rows }), /duplicate/);
});
test("bad custom type rejected", () => {
  const rows = defaultRows();
  rows.push({ id: "r9", fields: [{ id: "f_a", label: "A", type: "number" }] } as never);
  rejects(() => validateFormRows({ rows }), /custom field type/);
});
test("built-in type cannot change", () => {
  const rows = defaultRows();
  rows[0].fields[0].type = "email";
  rejects(() => validateFormRows({ rows }), /must have type/);
});
test("valid custom field accepted and renamed built-in kept", () => {
  const rows = defaultRows();
  rows[0].fields[0].label = "Name";
  rows.push({ id: "r9", fields: [{ id: "f_a", label: "Reviewer Email", type: "email" }] });
  const out = validateFormRows({ rows });
  assert.equal(out[0].fields[0].label, "Name");
  assert.equal(out[4].fields[0].type, "email");
});
