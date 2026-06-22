import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

function escapeCosmos(value: string) {
  return value.replace(/'/g, "\\'");
}

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const organizationId = request.query.get("organizationId");
  const search = request.query.get("search") ?? "";
  const status = request.query.get("status") ?? "";

  const page = Math.max(1, parseInt(request.query.get("page") ?? "1", 10));

  const pageSize = Math.min(
    50,
    parseInt(request.query.get("pageSize") ?? "10", 10),
  );

  if (!organizationId) {
    return {
      status: 400,
      jsonBody: { message: "organizationId is required" },
    };
  }

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [
    `c.organizationId = '${escapeCosmos(organizationId)}'`,
  ];

  if (status) {
    conditions.push(`c.status = '${escapeCosmos(status)}'`);
  }

  if (search) {
    const s = escapeCosmos(search);
    conditions.push(`
      (
        CONTAINS(LOWER(c.title), LOWER('${s}')) OR
        CONTAINS(LOWER(c.description), LOWER('${s}'))
      )
    `);
  }

  const whereClause = conditions.join(" AND ");

  try {
    const countQuery = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
    };

    const countResult = await container.items.query(countQuery).fetchAll();
    const total = countResult.resources[0] ?? 0;

    const dataQuery = {
      query: `
        SELECT *
        FROM c
      WHERE ${whereClause}
        ORDER BY c.createdAt DESC, c.id DESC
        OFFSET ${offset} LIMIT ${pageSize}
      `,
    };

    const dataResult = await container.items.query(dataQuery).fetchAll();

    return {
      status: 200,
      jsonBody: {
        data: dataResult.resources,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  } catch (error) {
    context.error("GetTasks failed", {
      error,
      organizationId,
      search,
      status,
    });

    return {
      status: 500,
      jsonBody: {
        message: "Failed to fetch tasks",
      },
    };
  }
}

app.http("GetTasks", {
  methods: ["GET"],
  authLevel: "function",
  handler: GetTasks,
});
