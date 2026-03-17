import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { configService } from "../services/configService";

export async function GetFormConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Mengambil Form Config...`);
    
    try {
        const config = await configService.getConfig();
        return {
            status: 200,
            jsonBody: config
        };
    } catch (error: any) {
        context.error("Error mengambil Form Config:", error.message);
        return {
            status: 404,
            jsonBody: { error: error.message }
        };
    }
}

app.http('GetFormConfig', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetFormConfig
});