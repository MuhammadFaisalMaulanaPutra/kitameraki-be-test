import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { database, settingsContainer } from "../database/cosmos";

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "date" | "datetime";
  placeholder?: string;
  column: 1 | 2;
  order: number;
}

function validateFields(fields: any): string | null {
  if (!Array.isArray(fields)) {
    return "fields must be an array";
  }

  const validTypes = ["text", "email", "date", "datetime"];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    if (!field.label || typeof field.label !== "string" || !field.label.trim()) {
      return `Field at index ${i} requires a non-empty label`;
    }

    if (!validTypes.includes(field.type)) {
      return `Field at index ${i} has unsupported type "${field.type}". Supported types are text, email, date, datetime`;
    }

    if (field.column !== 1 && field.column !== 2) {
      return `Field at index ${i} must have column 1 or 2`;
    }

    if (typeof field.order !== "number") {
      return `Field at index ${i} must have an order as a number`;
    }
  }

  return null;
}

export async function SaveFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {

    await database.containers.createIfNotExists({
      id: "form-settings",
      partitionKey: { paths: ["/id"] },
    });

    const body = (await request.json()) as any;

    const validationError = validateFields(body?.fields);
    if (validationError) {
      return {
        status: 400,
        jsonBody: { message: validationError },
      };
    }


    let existingResource: any = null;
    try {
      const { resource } = await settingsContainer.item("global", "global").read();
      existingResource = resource;
    } catch (e) {

    }

    const now = new Date().toISOString();
    const updatedSettings = {
      id: "global",
      fields: body.fields.map((f) => ({
        id: f.id || crypto.randomUUID(),
        label: f.label.trim(),
        type: f.type,
        placeholder: f.placeholder || "",
        column: f.column,
        order: f.order,
      })),
      createdAt: existingResource?.createdAt || now,
      updatedAt: now,
    };

    const result = await settingsContainer.items.upsert(updatedSettings);

    return {
      status: 200,
      jsonBody: {
        fields: result.resource.fields,
      },
    };
  } catch (error) {
    context.error("Failed to save form settings", error);
    return {
      status: 500,
      jsonBody: {
        message: "Failed to save form settings",
      },
    };
  }
}

app.http("SaveFormSettings", {
  methods: ["POST"],
  authLevel: "function",
  route: "form-settings",
  handler: SaveFormSettings,
});
