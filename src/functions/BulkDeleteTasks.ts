import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskService } from "../services/taskServices";
import { z } from "zod";

const BulkDeleteSchema = z.array(z.string()).min(1, "Minimal harus ada 1 ID yang dikirim!");

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Akses fungsi bulk delete`);

    try{
        const body = await request.json() as any;

        context.log("Body yang diterima:", body);

        const ids = Array.isArray(body) ? body : (body && Array.isArray(body.ids)) ? body.ids : null;

        if (!ids) {
            return {
                status: 400,
                jsonBody: {
                    error: "Body harus berupa array of string (id) atau objek { ids: [...] }"
                }
            }
        }

        const validationResult = BulkDeleteSchema.safeParse(ids);

        if(!validationResult.success){
            return {
                status: 400,
                jsonBody: {
                    error: "Body harus berupa array of string (id)",
                    details: validationResult.error.format()
                }
            }
        }

        const idsToDelete = validationResult.data;

        const deletedCount = await taskService.bulkDeleteTasks(idsToDelete);

        return {
            status: 200,
            jsonBody: {
                message: "Proses hapus massal selesai.",
                totalDiminta: idsToDelete.length,
                totalBerhasilDihapus: deletedCount
            }
        }
    }catch(error: any){
        context.error("Error saat bulk delete: ", error);
        return {
            status: 500,
            jsonBody: {error: "Terjadi kesalahan pada server"}
        }
    }
};

app.http('BulkDeleteTasks', {
    methods: ['POST','DELETE'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});
