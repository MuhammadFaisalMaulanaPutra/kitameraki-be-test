import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { handleError, ok, HttpError } from "../shared/http";

type DeleteStatus = "deleted" | "notFound" | "failed";

interface DeleteResult {
    id: string;
    status: DeleteStatus;
    error?: string;
}

interface BulkDeleteSummary {
    organizationId: string;
    requested: number;
    deduped: number;
    deleted: number;
    notFound: number;
    failed: number;
    results: DeleteResult[];
}

const MAX_IDS = 100;
const CONCURRENCY = 10;
async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const current = index++;
            results[current] = await tasks[current]();
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
async function parseInput(request: HttpRequest): Promise<{
    organizationId: string;
    ids: unknown[];
}> {
    const qOrg = request.query.get("organizationId")?.trim() ?? undefined;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        try {
            const body = await request.json() as Record<string, unknown>;
            if (body && typeof body === "object") {
                return {
                    organizationId: (qOrg ?? body.organizationId) as string,
                    ids: Array.isArray(body.ids) ? body.ids : [],
                };
            }
        } catch {
            throw new HttpError(400, "Failed to parse request body as JSON.");
        }
    }
    const idsParam = request.query.get("ids");
    const ids = idsParam ? idsParam.split(",").map(s => s.trim()).filter(Boolean) : [];

    return { organizationId: qOrg as string, ids };
}

function isNotFound(err: unknown): boolean {
    const code = (err as { code?: number | string })?.code;
    return code === 404 || code === "NotFound";
}

function isFatal(message: string): boolean {
    return /timed out|timeout|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|certificate|unauthorized|forbidden/i.test(message);
}

export async function BulkDeleteTasks(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const { organizationId, ids } = await parseInput(request);

        if (!organizationId || typeof organizationId !== "string" || !organizationId.trim()) {
            throw new HttpError(400, "Missing required field: organizationId");
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            throw new HttpError(400, "Missing required field: ids must be a non-empty array of task id strings.");
        }

        const rawIds = ids.map(id => String(id).trim()).filter(Boolean);
        const requested = rawIds.length;

        if (requested > MAX_IDS) {
            throw new HttpError(400, `Too many ids: ${requested}. Maximum allowed per request is ${MAX_IDS}.`);
        }

        const dedupedIds = [...new Set(rawIds)];

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);

        const tasks = dedupedIds.map(id => async (): Promise<DeleteResult> => {
            try {
                await container.item(id, organizationId).delete();
                return { id, status: "deleted" };
            } catch (err) {
                if (isNotFound(err)) return { id, status: "notFound" };

                const message = err instanceof Error ? err.message : String(err);
                if (isFatal(message)) throw err;

                context.warn(`BulkDeleteTasks: non-fatal error for id="${id}": ${message}`);
                return { id, status: "failed", error: message };
            }
        });

        const results = await runWithConcurrency(tasks, CONCURRENCY);

        const summary: BulkDeleteSummary = {
            organizationId,
            requested,
            deduped: dedupedIds.length,
            deleted: results.filter(r => r.status === "deleted").length,
            notFound: results.filter(r => r.status === "notFound").length,
            failed: results.filter(r => r.status === "failed").length,
            results,
        };

        return ok(summary);
    } catch (error) {
        return handleError(context, error, "BulkDeleteTasks");
    }
}

app.http("BulkDeleteTasks", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    handler: BulkDeleteTasks,
});
