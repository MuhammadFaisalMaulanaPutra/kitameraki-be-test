import { CosmosClient } from "@azure/cosmos";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function UpdateFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`UpdateFormSettings function processed request`);

  const body = await request.json();

  const { organizationId, fields, layout } = body as {
    organizationId: string;
    fields: any[];
    layout?: any[];
  };

  const defaultFields = [
    { key: "title", label: "Title", type: "text", isDefault: true },
    { key: "description", label: "Description", type: "text", isDefault: true },
    { key: "dueDate", label: "Due Date", type: "datetime", isDefault: true },
    { key: "priority", label: "Priority", type: "text", isDefault: true },
    { key: "status", label: "Status", type: "text", isDefault: true },
    { key: "tags", label: "Tags", type: "text", isDefault: true },
  ];

  const customFields = fields.filter(
    (field) =>
      !defaultFields.some((defaultField) => defaultField.key === field.key),
  );

  const finalFields = [...defaultFields, ...customFields];

  if (!organizationId) {
    return {
      status: 400,
      jsonBody: {
        message: "organizationId is required",
      },
    };
  }

  if (!fields || !Array.isArray(fields)) {
    return {
      status: 400,
      jsonBody: {
        message: "fields must be an array",
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

  let savedDocument;
  if (resources.length > 0) {
    const existing = resources[0];

    const updatedDoc = {
      ...existing,
      fields: finalFields,
      layout: layout || existing.layout,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container
      .item(existing.id, existing.organizationId)
      .replace(updatedDoc);

    savedDocument = resource;
  } else {
    const newDoc = {
      id: crypto.randomUUID(),
      organizationId,
      fields: finalFields,
      layout: layout || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.items.create(newDoc);

    savedDocument = resource;
  }

  return {
    status: 200,
    jsonBody: {
      message: "Form settings saved successfully",
      data: savedDocument,
    },
  };
}

app.http("UpdateFormSettings", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: UpdateFormSettings,
});
