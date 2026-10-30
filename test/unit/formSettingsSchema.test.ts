import assert from "node:assert/strict";
import test from "node:test";
import { builtInFields, formSettingsInputSchema } from "../../src/lib/formSettingsSchema";

function validSettings() {
    return {
        fields: [
            ...builtInFields.map((field) => ({ ...field })),
            { id: "cf-email", label: "Email", type: "email" as const, builtIn: false }
        ],
        rows: [
            { id: "row-1", fieldIds: ["title", "description"] },
            { id: "row-2", fieldIds: ["dueDate", "priority"] },
            { id: "row-3", fieldIds: ["status", "tags"] },
            { id: "row-4", fieldIds: ["cf-email"] }
        ]
    };
}

test("form settings accepts built-in and custom fields", () => {
    assert.equal(formSettingsInputSchema.safeParse(validSettings()).success, true);
});

test("form settings enforces row and field relationships", () => {
    const tooManyColumns = validSettings();
    tooManyColumns.rows[0].fieldIds.push("priority");
    assert.equal(formSettingsInputSchema.safeParse(tooManyColumns).success, false);

    const duplicatePlacement = validSettings();
    duplicatePlacement.rows[3].fieldIds.push("title");
    assert.equal(formSettingsInputSchema.safeParse(duplicatePlacement).success, false);

    const missingRow = validSettings();
    missingRow.rows.pop();
    assert.equal(formSettingsInputSchema.safeParse(missingRow).success, false);
});

test("form settings protects built-in fields", () => {
    const removed = validSettings();
    removed.fields = removed.fields.filter((field) => field.id !== "title");
    removed.rows = removed.rows.map((row) => ({
        ...row,
        fieldIds: row.fieldIds.filter((fieldId) => fieldId !== "title")
    }));
    assert.equal(formSettingsInputSchema.safeParse(removed).success, false);

    const changedType = validSettings();
    changedType.fields.find((field) => field.id === "dueDate")!.type = "date";
    assert.equal(formSettingsInputSchema.safeParse(changedType).success, false);

    const markedCustom = validSettings();
    markedCustom.fields.find((field) => field.id === "status")!.builtIn = false;
    assert.equal(formSettingsInputSchema.safeParse(markedCustom).success, false);
});

test("form settings constrains custom field ids", () => {
    for (const id of ["__proto__", "contains space", "a".repeat(51)]) {
        const settings = validSettings();
        settings.fields.push({ id, label: "Invalid", type: "text", builtIn: false });
        settings.rows.push({ id: "row-invalid", fieldIds: [id] });
        assert.equal(formSettingsInputSchema.safeParse(settings).success, false);
    }
});

test("form settings limits total fields", () => {
    const settings = validSettings();
    for (let index = settings.fields.length; index <= 50; index++) {
        const id = `cf-${index}`;
        settings.fields.push({ id, label: id, type: "text", builtIn: false });
        settings.rows.push({ id: `row-${index}`, fieldIds: [id] });
    }
    assert.equal(formSettingsInputSchema.safeParse(settings).success, false);
});

test("form settings rejects duplicate ids", () => {
    const duplicateField = validSettings();
    duplicateField.fields.push({ ...duplicateField.fields[6] });
    assert.equal(formSettingsInputSchema.safeParse(duplicateField).success, false);

    const duplicateRow = validSettings();
    duplicateRow.rows.push({ id: "row-1", fieldIds: ["cf-email"] });
    assert.equal(formSettingsInputSchema.safeParse(duplicateRow).success, false);
});
