import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskService } from "../services/taskServices";
import { TaskSchema } from "../models/task";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // cek id url
        const id = request.query.get("id");

        if(!id){
            return{
                status: 400,
                jsonBody: { error: "Parameter id harus ada di URL"}
            }
        }

        // ambil data dari body yang mau diubah
        const body = await request.json();

        const validationResult = TaskSchema.partial().safeParse(body);

        if(!validationResult.success){
            return{
                status: 400,
                jsonBody: {
                    error: "Data yang dikirim tidak valid!",
                    details: validationResult.error.format()
                }
            }
        }

        const updatedTask = await taskService.updateTask(id, validationResult.data);

        if(!updatedTask){
            return{
                status: 404,
                jsonBody: { error: "Task tidak ditemukan"}
            }
        }

        return{
            status: 200,
            jsonBody: updatedTask
        }
    } catch (error: any) {
        context.error("Error saat update tugas: ", error);
        return{
            status: 500,
            jsonBody: { error: "Terjadi kesalahan pada server"}
        }
    }        
}

app.http('UpdateTask', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    handler: UpdateTask
});