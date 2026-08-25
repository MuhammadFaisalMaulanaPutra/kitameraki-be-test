import { ValidationError } from '@/errors/validation.error'
import type { ParamViolation } from '@/errors/validation.error'
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import type { ValidateFunction } from 'ajv'

export type ValidatedBodyHandler<T> = (
  request: HttpRequest,
  context: InvocationContext,
  validatedBody: T
) => Promise<HttpResponseInit>

function toViolation(instancePath: string, message: string | undefined): ParamViolation {
  if (!instancePath) return { field: 'root', message: message ?? 'Invalid value' }
  return {
    field: instancePath.replace(/^\//, '').replaceAll('/', '.'),
    message: message ?? 'Invalid value'
  }
}

export function validateBody<T>(validate: ValidateFunction<T>, next: ValidatedBodyHandler<T>) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new ValidationError([{ field: 'body', message: 'Malformed JSON payload.' }])
    }

    if (!validate(rawBody)) {
      throw new ValidationError(
        (validate.errors ?? []).map((error) => toViolation(error.instancePath, error.message))
      )
    }

    return next(request, context, rawBody as T)
  }
}
