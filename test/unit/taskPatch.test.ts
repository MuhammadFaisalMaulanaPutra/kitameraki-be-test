import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskPatchOperations } from "../../src/lib/taskPatch";
import { createTaskSchema, updateTaskSchema } from "../../src/lib/taskSchema";

const organizationId = "11111111-1111-4111-8111-111111111111";

test("optional task fields can be cleared with null", () => {
    assert.equal(
        updateTaskSchema.safeParse({
            description: null,
            dueDate: null,
            priority: null,
            tags: null
        }).success,
        true
    );
});

test("create still omits null optional fields", () => {
    assert.equal(
        createTaskSchema.safeParse({
            organizationId,
            title: "Task",
            status: "todo",
            description: null
        }).success,
        false
    );
});

test("null task fields become remove operations", () => {
    assert.deepEqual(
        buildTaskPatchOperations({
            title: "Changed",
            description: null,
            priority: "high"
        }),
        [
            { op: "set", path: "/title", value: "Changed" },
            { op: "remove", path: "/description" },
            { op: "set", path: "/priority", value: "high" }
        ]
    );
});
