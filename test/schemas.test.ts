import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TaskSchema,
  CreateTaskSchema,
  GetTasksQuerySchema,
  BulkDeleteTasksSchema,
} from "../src/schemas/task.schema.ts";
import {
  FormSettingSchema,
  FormComponentSchema,
  UpsertFormSettingSchema,
} from "../src/schemas/form-setting.schema.ts";

describe("Task Schema Suite", () => {
  const validOrgId = "11111111-1111-1111-1111-111111111111";
  const validTaskId = "22222222-2222-2222-2222-222222222222";

  it("should validate a valid task with customFields", () => {
    const validTask = {
      id: validTaskId,
      organizationId: validOrgId,
      title: "Write documentation",
      description: "Document test results",
      dueDate: "2026-10-15T10:00:00.000Z",
      priority: "high",
      status: "todo",
      tags: ["docs", "backend"],
      customFields: {
        reviewerEmail: "reviewer@example.com",
        submissionDate: "2026-10-14",
      },
    };

    const result = TaskSchema.safeParse(validTask);
    assert.equal(result.success, true);
  });

  it("should reject task with invalid UUID for organizationId", () => {
    const invalidTask = {
      id: validTaskId,
      organizationId: "not-a-uuid",
      title: "Task with bad org",
      status: "todo",
    };

    const result = TaskSchema.safeParse(invalidTask);
    assert.equal(result.success, false);
  });

  it("should validate CreateTaskSchema generating or accepting optional id", () => {
    const input = {
      organizationId: validOrgId,
      title: "New Task",
      status: "in-progress",
      customFields: {
        department: "Engineering",
      },
    };

    const result = CreateTaskSchema.safeParse(input);
    assert.equal(result.success, true);
  });

  it("should validate query schema and reject invalid date ranges", () => {
    const invalidQuery = {
      organizationId: validOrgId,
      startDate: "2026-10-20",
      endDate: "2026-10-10",
    };

    const result = GetTasksQuerySchema.safeParse(invalidQuery);
    assert.equal(result.success, false);
  });

  it("should parse comma-separated task IDs in BulkDeleteTasksSchema", () => {
    const id1 = "33333333-3333-3333-3333-333333333333";
    const id2 = "44444444-4444-4444-4444-444444444444";
    const result = BulkDeleteTasksSchema.safeParse({
      organizationId: validOrgId,
      taskIds: `${id1},${id2}`,
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.taskIds, [id1, id2]);
    }
  });
});

describe("bpmn.io Form Setting Schema Suite (Part 2)", () => {
  const validOrgId = "11111111-1111-1111-1111-111111111111";

  it("should validate bpmn.io FormComponent with key, label, type, layout, validate", () => {
    const validComponent = {
      id: "Field_reviewerEmail",
      key: "reviewerEmail",
      label: "Reviewer Email",
      type: "email",
      layout: {
        row: 0,
        column: 1,
      },
      validate: {
        required: true,
      },
      description: "Lead reviewer contact",
    };

    const result = FormComponentSchema.safeParse(validComponent);
    assert.equal(result.success, true);
  });

  it("should reject component layout with column exceeding maximum of 2 columns", () => {
    const invalidComponent = {
      id: "Field_badCol",
      key: "extraCol",
      label: "Extra Column",
      type: "text",
      layout: {
        row: 0,
        column: 3,
      },
    };

    const result = FormComponentSchema.safeParse(invalidComponent);
    assert.equal(result.success, false);
  });

  it("should validate full FormSetting document with bpmn.io components structure", () => {
    const validSetting = {
      id: "default",
      organizationId: validOrgId,
      schemaVersion: 1,
      type: "default",
      components: [
        {
          id: "Field_1",
          key: "notes",
          label: "Custom Notes",
          type: "text",
          layout: { row: 0, column: 1 },
          validate: { required: false },
        },
        {
          id: "Field_2",
          key: "dueTime",
          label: "Scheduled Time",
          type: "datetime",
          layout: { row: 0, column: 2 },
          validate: { required: false },
        },
        {
          id: "Field_3",
          key: "deadlineDate",
          label: "Hard Deadline",
          type: "date",
          layout: { row: 1, column: 1 },
          validate: { required: true },
        },
        {
          id: "Field_4",
          key: "contactEmail",
          label: "Contact Email",
          type: "email",
          layout: { row: 1, column: 2 },
          validate: { required: false },
        },
      ],
    };

    const result = FormSettingSchema.safeParse(validSetting);
    assert.equal(result.success, true);
  });

  it("should normalize legacy fields payload into bpmn.io components via UpsertFormSettingSchema", () => {
    const legacyPayload = {
      organizationId: validOrgId,
      fields: [
        { id: "fld-1", name: "Approver", type: "email", row: 0, column: 1, required: true },
        { id: "fld-2", name: "Signoff Date", type: "date", row: 0, column: 2, required: false },
      ],
    };

    const result = UpsertFormSettingSchema.safeParse(legacyPayload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.components.length, 2);
      assert.equal(result.data.components[0].label, "Approver");
      assert.equal(result.data.components[0].type, "email");
      assert.equal(result.data.components[0].layout.column, 1);
      assert.equal(result.data.components[0].validate.required, true);
    }
  });
});
