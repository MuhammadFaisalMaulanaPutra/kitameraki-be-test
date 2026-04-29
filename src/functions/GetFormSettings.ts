import { CosmosClient } from "@azure/cosmos";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function GetFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`GetFormSettings function processed request`);

  const organizationId = request.query.get("organizationId");

  if (!organizationId) {
    return {
      status: 400,
      jsonBody: {
        message: "organizationId is required",
      },
    };
  }

  const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);

  const container = client.database("TaskApp").container("FormSettings");

  const querySpec = {
    query: `
      SELECT * 
      FROM c
      WHERE c.organizationId = @organizationId
    `,
    parameters: [
      {
        name: "@organizationId",
        value: organizationId,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  /**
   * If settings already exist
   */
  if (resources.length > 0) {
    return {
      status: 200,
      jsonBody: resources[0],
    };
  }
  const defaultSettings = {
    id: crypto.randomUUID(),
    organizationId,
    fields: [
      { label: "Title", type: "text", key: "title", isDefault: true },
      { label: "Description", type: "text", key: "description", isDefault: true },
      { label: "Due Date", type: "datetime", key: "dueDate", isDefault: true },
      { label: "Priority", type: "text", key: "priority", isDefault: true },
      { label: "Status", type: "text", key: "status", isDefault: true },
      { label: "Tags", type: "text", key: "tags", isDefault: true },
    ],
    layout: [
      {
        id: "row-1",
        columns: [
          { id: "col-1", field: { label: "Title", type: "text", key: "title", isDefault: true } }
        ]
      },
      {
        id: "row-2",
        columns: [
          { id: "col-2", field: { label: "Description", type: "text", key: "description", isDefault: true } }
        ]
      },
      {
        id: "row-3",
        columns: [
          { id: "col-3", field: { label: "Due Date", type: "datetime", key: "dueDate", isDefault: true } },
          { id: "col-4", field: { label: "Priority", type: "text", key: "priority", isDefault: true } }
        ]
      },
      {
        id: "row-4",
        columns: [
          { id: "col-5", field: { label: "Status", type: "text", key: "status", isDefault: true } },
          { id: "col-6", field: { label: "Tags", type: "text", key: "tags", isDefault: true } }
        ]
      }
    ],
  };

  await container.items.create(defaultSettings);

  return {
    status: 200,
    jsonBody: defaultSettings,
  };
}

app.http("GetFormSettings", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetFormSettings,
});
