import { ValidationError } from '@/errors/validation.error'
import type { ApiResponse } from '@/models/responses/api-response.dto'
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

export function successResponse<T>(statusCode: number, options: ApiResponse<T>) {
  return {
    status: statusCode,
    jsonBody: {
      message: options.message ?? 'Request completed successfully.',
      data: options.data,
      ...(options.meta && { meta: options.meta })
    }
  }
}

export function noContentResponse() {
  return {
    status: status.NO_CONTENT
  }
}
