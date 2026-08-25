import { ValidationError } from '@/errors/validation.error'
import type { HttpRequest } from '@azure/functions'

export function requireRouteParameter(request: HttpRequest, name: string): string {
  const value = request.params?.[name]
  if (!value) throw new ValidationError([{ field: name, message: 'Route parameter is required.' }])
  return value
}

export function requireIfMatch(request: HttpRequest): string | null {
  return request.headers.get('if-match')
}

export function successResponse<T>(statusCode: number, data: T, meta?: Record<string, unknown>) {
  return {
    status: statusCode,
    jsonBody: {
      success: true,
      code: statusCode,
      data,
      ...(meta && { meta })
    }
  }
}
