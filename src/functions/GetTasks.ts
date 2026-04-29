import { CosmosClient } from "@azure/cosmos";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const organizationId = request.query.get("organizationId");
  const page = parseInt(request.query.get("page") || "1");

  const priority = request.query.get("priority") || "";
  const status = request.query.get("status") || "";

  const limit = 7;

  if (!organizationId) {
    return {
      status: 400,
      jsonBody: {
        message: "organizationId is required",
      },
    };
  }

  const offset = (page - 1) * limit;

  const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);

  const container = client.database("TaskApp").container("Tasks");

  /**
   * BASE QUERY
   */
  let baseWhere = `
    WHERE c.organizationId = @organizationId
  `;

  const baseParameters: any[] = [
    {
      name: "@organizationId",
      value: organizationId,
    },
  ];

  /**
   * PRIORITY FILTER
   */
  if (priority) {
    baseWhere += `
      AND LOWER(c.priority) = LOWER(@priority)
    `;

    baseParameters.push({
      name: "@priority",
      value: priority,
    });
  }

  /**
   * STATUS FILTER
   */
  if (status) {
    baseWhere += `
      AND LOWER(c.status) = LOWER(@status)
    `;

    baseParameters.push({
      name: "@status",
      value: status,
    });
  }

  /**
   * COUNT QUERY
   */
  const countQuery = {
    query: `
      SELECT VALUE COUNT(1)
      FROM c
      ${baseWhere}
    `,
    parameters: [...baseParameters],
  };

  const countResult = await container.items.query(countQuery).fetchAll();

  const totalItems = countResult.resources[0] || 0;
  const totalPages = Math.ceil(totalItems / limit);

  /**
   * DATA QUERY + PAGINATION
   */
  const dataQuery = {
    query: `
      SELECT *
      FROM c
      ${baseWhere}
      OFFSET @offset LIMIT @limit
    `,
    parameters: [
      ...baseParameters,
      {
        name: "@offset",
        value: offset,
      },
      {
        name: "@limit",
        value: limit,
      },
    ],
  };

  const tasks = await container.items.query(dataQuery).fetchAll();

  return {
    status: 200,
    jsonBody: {
      data: tasks.resources,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    },
  };
}

app.http("GetTasks", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetTasks,
});
