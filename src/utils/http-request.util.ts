import { ValidationError } from '@/errors/validation.error'
import type { ApiResponse, ResponseMeta } from '@/models/responses/api-response.dto'
import type { HttpRequest } from '@azure/functions'
import status from 'http-status'

export function requireRouteParameter(request: HttpRequest, name: string): string {
  const value = request.params?.[name]
  if (!value) throw new ValidationError([{ field: name, message: 'Route parameter is required.' }])
  return value
}

export function requireIfMatch(request: HttpRequest): string | null {
  return request.headers.get('if-match')
}

interface ExtraResponseOptions {
  headers?: Record<string, string>
  etag?: string
  meta?: ResponseMeta
}

export function successResponse<T>(
  statusCode: number,
  options: ApiResponse<T>,
  extra?: ExtraResponseOptions
) {
  const meta = options.meta ?? extra?.meta
  const headers = {
    ...extra?.headers,
    ...(extra?.etag && { ETag: extra.etag })
  }

  return {
    status: statusCode,
    ...(Object.keys(headers).length > 0 && { headers }),
    jsonBody: {
      message: options.message ?? 'Request completed successfully.',
      data: options.data,
      ...(meta && { meta })
    }
  }
}

export function noContentResponse() {
  return {
    status: status.NO_CONTENT
  }
}
