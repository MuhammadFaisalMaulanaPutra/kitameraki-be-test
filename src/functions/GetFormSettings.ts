import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ensureContainer } from "../config/cosmos";
import { handleError, ok } from "../shared/http";
import { requireQuery } from "../shared/validation";

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = requireQuery(request, "organizationId");

        const container = await ensureContainer("FormSettings");

        try {
            const { resource } = await container.item("task-form", organizationId).read();
            if (!resource) {
                return ok({ organizationId, id: "task-form", fields: [] });
            }
            return ok(resource);
        } catch (err: any) {
            if (err.code === 404) {
                return ok({ organizationId, id: "task-form", fields: [] });
            }
            throw err;
        }

    } catch (error) {
        return handleError(context, error, "GetFormSettings");
    }
}

app.http("GetFormSettings", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: GetFormSettings,
});
