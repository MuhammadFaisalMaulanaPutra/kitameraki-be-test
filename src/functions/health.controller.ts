import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { checkDatabaseHealth } from '../config/cosmos.js';
import { successResponse } from '../utils/response.util.js';

export async function healthCheckHandler(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('[HTTP GET] Checking system health...');

    const startTime = Date.now();
    const isDbHealthy = await checkDatabaseHealth();
    const latencyMs = Date.now() - startTime;
    const healthData = {
        status: isDbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
            status: isDbHealthy ? 'connected' : 'disconnected',
            latencyMs: isDbHealthy ? `${latencyMs}ms` : undefined,
        },
    };

    if (!isDbHealthy) {
        return {
            status: 503,
            jsonBody: {
                success: false,
                data: healthData,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Koneksi ke Cosmos DB gagal atau terputus.',
                },
            },
        };
    }

    return successResponse(healthData, 200);
}

app.http('HealthCheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: healthCheckHandler,
});