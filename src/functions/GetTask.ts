import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskService } from "../services/taskServices";
import { error } from "console";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try{
        const id = request.query.get('id');

        // cek id di url
        if(!id){
            return {
                status: 400,
                jsonBody: {error: "Pararmeter id harus ada di URL"}
            }
        }

        const task = await taskService.getTaskById(id);

        if(!task){
            return {
                status: 404,
                jsonBody: {error: `Task id: ${id} tidak ditemukan`}
            }
        }

        return {
            status: 200,
            jsonBody: task
        }
    }catch(error: any){
        context.error("Error saat get task: ", error);
        return {
            status: 500,
            jsonBody: {error: "Terjadi kesalahan pada server"}
        }
    }
};

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTask
});
