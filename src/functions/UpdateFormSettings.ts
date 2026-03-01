import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ensureContainer } from "../config/cosmos";
import { handleError, ok, parseJson } from "../shared/http";
import { validateFormSettings } from "../shared/validation";

export async function UpdateFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await parseJson<Record<string, unknown>>(request);
        const validated = validateFormSettings(body);

        const container = await ensureContainer("FormSettings");
        const { resource } = await container.items.upsert(validated);

        return ok(resource);
    } catch (error) {
        return handleError(context, error, "UpdateFormSettings");
    }
}

app.http("UpdateFormSettings", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: UpdateFormSettings,
});
