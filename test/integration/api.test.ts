import assert from "node:assert/strict";
import test from "node:test";
import { builtInFields } from "../../src/lib/formSettingsSchema";
import type { FormFieldDefinition } from "../../src/lib/formSettingsSchema";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:7071/api";
const organizationId = "44444444-4444-4444-8444-444444444444";
const emptyOrganizationId = "55555555-5555-4555-8555-555555555555";
const missingTaskId = "22222222-2222-4222-8222-222222222222";

interface ApiResult {
    status: number;
    body: any;
}

async function api(method: string, path: string, body?: unknown, raw?: string): Promise<ApiResult> {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body === undefined && raw === undefined ? undefined : { "content-type": "application/json" },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
    });
    const text = await response.text();
    return {
        status: response.status,
        body: text ? JSON.parse(text) : undefined
    };
}

function assertError(result: ApiResult, status: number, code: string): void {
    assert.equal(result.status, status);
    assert.equal(result.body.error.code, code);
}

function taskQuery(org = organizationId): string {
    return `/tasks?organizationId=${org}`;
}

function settingsInput(fields = builtInFields, rows = [
    { id: "r1", fieldIds: ["title", "description"] },
    { id: "r2", fieldIds: ["dueDate", "priority"] },
    { id: "r3", fieldIds: ["status", "tags"] }
]) {
    return {
        fields: structuredClone(fields),
        rows: structuredClone(rows)
    };
}

async function cleanupTasks(org: string): Promise<void> {
    const result = await api("GET", taskQuery(org));
    if (result.status !== 200 || result.body.items.length === 0) {
        return;
    }

    const ids = result.body.items.map((task: { id: string }) => task.id);
    await api("POST", `/tasks/bulk-delete?organizationId=${org}`, ids);
}

test("API integration", async t => {
    t.after(async () => {
        await cleanupTasks(organizationId).catch(() => undefined);
    });

    await cleanupTasks(organizationId);

    await t.test("task validation, DTO, and REST statuses", async () => {
        const created = await api("POST", "/tasks", {
            organizationId,
            title: "Integration task",
            status: "todo"
        });
        assert.equal(created.status, 201);
        assert.equal(created.body.title, "Integration task");
        assert.equal(Object.keys(created.body).some(key => key.startsWith("_")), false);

        assertError(
            await api("POST", "/tasks", { organizationId, title: "bad", status: "todo", id: missingTaskId }),
            400,
            "VALIDATION_ERROR"
        );
        assertError(await api("POST", "/tasks", undefined, "{bad"), 400, "INVALID_JSON");
        assertError(await api("GET", `/tasks/${missingTaskId}?organizationId=${organizationId}`), 404, "NOT_FOUND");

        const updated = await api(
            "PATCH",
            `/tasks/${created.body.id}?organizationId=${organizationId}`,
            { description: "created by set operation" }
        );
        assert.equal(updated.status, 200);
        assert.equal(updated.body.description, "created by set operation");
        assert.equal(Object.keys(updated.body).some(key => key.startsWith("_")), false);
    });

    await t.test("bulk delete is atomic", async () => {
        const task = await api("POST", "/tasks", { organizationId, title: "bulk survivor", status: "todo" });
        const missing = await api("POST", `/tasks/bulk-delete?organizationId=${organizationId}`, [
            task.body.id,
            missingTaskId
        ]);
        assertError(missing, 404, "NOT_FOUND");

        const survivor = await api("GET", `/tasks/${task.body.id}?organizationId=${organizationId}`);
        assert.equal(survivor.status, 200);
        assertError(
            await api("POST", `/tasks/bulk-delete?organizationId=${organizationId}`, [task.body.id, task.body.id]),
            400,
            "VALIDATION_ERROR"
        );
        assert.equal(
            (await api("POST", `/tasks/bulk-delete?organizationId=${organizationId}`, [task.body.id])).status,
            204
        );
    });

    await t.test("pagination, filters, search, and count", async () => {
        const createdIds: string[] = [];
        for (let index = 1; index <= 25; index++) {
            const status = ["todo", "in-progress", "completed"][(index - 1) % 3];
            const priority = ["low", "medium", "high"][(index - 1) % 3];
            const created = await api("POST", "/tasks", {
                organizationId,
                title: index % 5 === 0 ? `Alpha ${index}` : `Task ${index}`,
                status,
                priority
            });
            assert.equal(created.status, 201);
            createdIds.push(created.body.id);
        }

        const first = await api("GET", taskQuery());
        assert.equal(first.status, 200);
        assert.equal(first.body.total, 25);
        assert.equal(first.body.items.length, 20);
        assert.equal(first.body.page, 1);
        assert.equal(first.body.pageSize, 20);

        const second = await api("GET", `/tasks?organizationId=${organizationId}&page=2`);
        assert.equal(second.body.items.length, 5);
        const firstIds = new Set(first.body.items.map((task: { id: string }) => task.id));
        assert.equal(second.body.items.some((task: { id: string }) => firstIds.has(task.id)), false);

        const search = await api("GET", `/tasks?organizationId=${organizationId}&search=ALPHA`);
        assert.equal(search.body.total, 5);
        assert.equal(search.body.items.every((task: { title: string }) => task.title.startsWith("Alpha")), true);

        const combined = await api(
            "GET",
            `/tasks?organizationId=${organizationId}&search=alpha&status=todo`
        );
        assert.equal(combined.body.total, 2);
        assert.equal(
            (await api("GET", `/tasks?organizationId=${organizationId}&pageSize=101`)).status,
            400
        );
        assert.equal(
            (await api("GET", `/tasks?organizationId=${organizationId}&search=`)).body.total,
            25
        );

        assert.equal(
            (await api("POST", `/tasks/bulk-delete?organizationId=${organizationId}`, createdIds)).status,
            204
        );
    });

    await t.test("form settings and custom field merge", async () => {
        const customFields: FormFieldDefinition[] = [
            { id: "cf-email", label: "Email", type: "email", builtIn: false },
            { id: "cf-date", label: "Date", type: "date", builtIn: false },
            { id: "cf-dt", label: "Date time", type: "datetime", builtIn: false },
            { id: "cf-text", label: "Notes", type: "text", builtIn: false }
        ];
        const fields = [...builtInFields, ...customFields];
        const rows = [
            { id: "r1", fieldIds: ["title", "description"] },
            { id: "r2", fieldIds: ["dueDate", "priority"] },
            { id: "r3", fieldIds: ["status", "tags"] },
            { id: "r4", fieldIds: ["cf-email", "cf-date"] },
            { id: "r5", fieldIds: ["cf-dt", "cf-text"] }
        ];

        const defaults = await api("GET", `/form-settings?organizationId=${emptyOrganizationId}`);
        assert.equal(defaults.status, 200);
        assert.equal(defaults.body.fields.length, builtInFields.length);

        const saved = await api(
            "PUT",
            `/form-settings?organizationId=${organizationId}`,
            settingsInput(fields, rows)
        );
        assert.equal(saved.status, 200);

        const values = {
            "cf-email": "user@example.com",
            "cf-date": "2026-11-01",
            "cf-dt": "2026-11-01T10:00:00+07:00",
            "cf-text": "hello"
        };
        const task = await api("POST", "/tasks", {
            organizationId,
            title: "custom fields",
            status: "todo",
            customFields: values
        });
        assert.equal(task.status, 201);
        const taskPath = `/tasks/${task.body.id}?organizationId=${organizationId}`;

        const partial = await api("PATCH", taskPath, {
            customFields: { "cf-text": "changed" }
        });
        assert.deepEqual(partial.body.customFields, { ...values, "cf-text": "changed" });

        const removed = await api("PATCH", taskPath, {
            customFields: { "cf-text": null }
        });
        assert.equal("cf-text" in removed.body.customFields, false);
        assert.equal(removed.body.customFields["cf-email"], values["cf-email"]);

        const changedType = structuredClone(fields);
        changedType.find(field => field.id === "cf-text")!.type = "email";
        assertError(
            await api(
                "PUT",
                `/form-settings?organizationId=${organizationId}`,
                settingsInput(changedType, rows)
            ),
            400,
            "VALIDATION_ERROR"
        );

        const patches = await Promise.all(
            Array.from({ length: 8 }, (_, index) => api("PATCH", taskPath, {
                customFields: { "cf-text": `value-${index}` }
            }))
        );
        assert.equal(patches.every(result => result.status === 200 || result.status === 409), true);
    });
});
