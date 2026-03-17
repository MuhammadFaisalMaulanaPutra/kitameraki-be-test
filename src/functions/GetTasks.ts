import {app, HttpRequest, HttpResponseInit, InvocationContext} from "@azure/functions";
import {taskService} from "../services/taskServices";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Mengambil daftar tugas dari URL: "${request.url}"`);
    try{
        // ambil page, limit, status dan search
        const pageParam = request.query.get("page") || "1";
        const limitParam = request.query.get("limit") || "10";
        const status = request.query.get('status') || 'All';
        const search = request.query.get('search') || '';

        // ubah tipe data ke number
        const page = parseInt(pageParam);
        const limit = parseInt(limitParam);

        // validasi page & limit
        if(page < 1 || limit < 1){
            return{
                status: 400,
                jsonBody: {
                    error: "Page dan limit harus lebih dari 0"
                }
            }
        }

        const tasks = await taskService.getTasks(page, limit, status, search);

        return {
            status: 200,
            jsonBody: tasks
        }
    } catch (error) {
        context.error("Error saat mengambil task: ", error);

        return {
            status: 500,
            jsonBody: {
                error: "Terjadi kesalahan pada server"
            }
        }
    }
}

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});