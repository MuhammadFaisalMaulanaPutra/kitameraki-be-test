import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { configService } from "../services/configService";
import { FormConfig } from "../models/task";

export async function UpdateFormConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Mengupdate Form Config...`);
    
    try {
        const newConfig = await request.json() as FormConfig;
        
        const updatedConfig = await configService.updateConfig(newConfig);
        
        return {
            status: 200,
            jsonBody: { 
                message: "Form Config berhasil diperbarui!",
                data: updatedConfig 
            }
        };
    } catch (error: any) {
        context.error("Error update Form Config:", error);
        return {
            status: 500,
            jsonBody: { error: "Terjadi kesalahan saat menyimpan Form Config." }
        };
    }
}

app.http('UpdateFormConfig', {
    methods: ['PUT', 'POST'],
    authLevel: 'anonymous',
    handler: UpdateFormConfig
});