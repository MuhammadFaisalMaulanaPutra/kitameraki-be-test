import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { taskService } from "../services/taskServices";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try{
        // ambil id yang ingin dihapus dari url
        const id = request.query.get("id");

        //validasi id
        if(!id){
            return{
                status: 400,
                jsonBody: { error: "Parameter id harus ada di URL"}
            }
        }

        const isDeleted = await taskService.deleteTask(id);

        if(!isDeleted){
            return{
                status: 404,
                jsonBody: { error: `Task id: ${id} tidak ditemukan`}
            }
        }

        return{
            status: 200,
            jsonBody: { message: `Task id: ${id} berhasil dihapus`}
        }
    } catch (error: any) {
        context.error("Error saat delete task: ", error);
        return{
            status: 500,
            jsonBody: { error: "Terjadi kesalahan pada server"}
        }
    }        
};

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: DeleteTask
});
