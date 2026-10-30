import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskListQueries } from "../../src/lib/taskListQuery";

const organizationId = "11111111-1111-4111-8111-111111111111";

test("task list query parameterizes every user value", () => {
    const search = "alpha' OR 1=1 --";
    const { itemsQuery, countQuery } = buildTaskListQueries({
        organizationId,
        search,
        status: "todo",
        priority: "high",
        page: 2,
        pageSize: 10
    });

    assert.equal(itemsQuery.query.includes(search), false);
    assert.match(itemsQuery.query, /CONTAINS\(c\.title, @search, true\)/);
    assert.match(itemsQuery.query, /OFFSET @offset LIMIT @limit/);
    assert.match(itemsQuery.query, /ORDER BY c\.createdAt DESC, c\.id ASC/);
    assert.deepEqual(itemsQuery.parameters.slice(-2), [
        { name: "@offset", value: 10 },
        { name: "@limit", value: 10 }
    ]);
    assert.equal(countQuery.query.startsWith("SELECT VALUE COUNT(1)"), true);
    assert.equal(countQuery.query.includes("@offset"), false);
});

test("task list count and item queries share filters", () => {
    const filters = {
        organizationId,
        status: "completed" as const,
        page: 1,
        pageSize: 20
    };
    const { itemsQuery, countQuery } = buildTaskListQueries(filters);

    assert.deepEqual(
        countQuery.parameters,
        itemsQuery.parameters.filter((parameter) => !["@offset", "@limit"].includes(parameter.name))
    );
    assert.match(countQuery.query, /c\.status = @status/);
});
