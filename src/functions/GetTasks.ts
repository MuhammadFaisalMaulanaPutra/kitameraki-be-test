import { app } from "@azure/functions";
import type { SqlParameter } from "@azure/cosmos";
import { tasks } from "../lib/cosmos";
import { handler, requireOrgId } from "../lib/http";
import { toTask } from "../lib/mappers";
import { validateListQuery } from "../lib/validation";

app.http("GetTasks", {
  methods: ["GET"],
  route: "tasks",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const q = validateListQuery(request.query);

    const where = ["c.organizationId = @org"];
    const parameters: SqlParameter[] = [{ name: "@org", value: organizationId }];

    if (q.status) { 
        where.push("c.status = @status"); 
        parameters.push({ name: "@status", value: q.status }); 
    }

    if (q.priority) { 
        where.push("c.priority = @priority"); 
        parameters.push({ name: "@priority", value: q.priority }); 
    }

    if (q.search) {
      where.push("(CONTAINS(c.title, @q, true) OR CONTAINS(c.description, @q, true))");
      parameters.push({ name: "@q", value: q.search });
    }

    const clause = where.join(" AND ");
    const options = { partitionKey: organizationId };

    const [{ resources: countRows }, { resources: items }] = await Promise.all([
      tasks.items.query<number>({ query: `SELECT VALUE COUNT(1) FROM c WHERE ${clause}`, parameters }, options).fetchAll(),
      tasks.items
        .query({
          query: `SELECT * FROM c WHERE ${clause} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`,
          parameters: [...parameters, { name: "@offset", value: (q.page - 1) * q.pageSize }, { name: "@limit", value: q.pageSize }],
        }, options)
        .fetchAll(),
    ]);

    return { jsonBody: { items: items.map(toTask), total: countRows[0] ?? 0, page: q.page, pageSize: q.pageSize } };
  }),
});
