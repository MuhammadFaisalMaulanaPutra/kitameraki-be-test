import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { database, settingsContainer } from "../database/cosmos";

export async function GetFormSettings(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {

    await database.containers.createIfNotExists({
      id: "form-settings",
      partitionKey: { paths: ["/id"] },
    });

    const { resource } = await settingsContainer.item("global", "global").read();

    if (!resource) {
      return {
        status: 200,
        jsonBody: {
          fields: [],
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        fields: resource.fields ?? [],
      },
    };
  } catch (error) {
    context.error("Failed to get form settings", error);
    return {
      status: 500,
      jsonBody: {
        message: "Failed to get form settings",
      },
    };
  }
}

app.http("GetFormSettings", {
  methods: ["GET"],
  authLevel: "function",
  route: "form-settings",
  handler: GetFormSettings,
});
