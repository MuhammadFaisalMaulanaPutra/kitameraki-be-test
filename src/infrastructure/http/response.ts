import { HttpResponseInit } from "@azure/functions";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}

export class ApiResponseBuilder {
    static success<T>(data: T, statusCode: number = 200, requestId?: string): HttpResponseInit {
        const response: ApiResponse<T> = {
            success: true,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                requestId
            }
        };
        return { jsonBody: response, status: statusCode };
    }

    static created<T>(data: T, requestId?: string): HttpResponseInit {
        return this.success(data, 201, requestId);
    }

    static error(
        code: string,
        message: string,
        statusCode: number = 400,
        details?: any,
        requestId?: string
    ): HttpResponseInit {
        const response: ApiResponse = {
            success: false,
            error: {
                code,
                message,
                ...(details && { details })
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId
            }
        };
        return { jsonBody: response, status: statusCode };
    }
}