import type { z } from 'zod';
import { BadRequestError, type ErrorDetail, ValidationError } from '../utils/errors';

function toErrorDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.flatMap((issue) => {
    // Report each unexpected property on its own path (mass-assignment protection, e.g. "id", "organizationId").
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        field: [...issue.path, key].join('.'),
        message: 'Unknown field is not allowed',
      }));
    }
    return [{ field: issue.path.length > 0 ? issue.path.join('.') : 'body', message: issue.message }];
  });
}

/**
 * Validates a JSON request body.
 * - missing / non-object body  -> 400 Bad Request
 * - schema violations           -> 422 Unprocessable Entity
 */
export function validateBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestError('Request body must be a JSON object');
  }

  const result = schema.safeParse(body);
  if (!result.success) throw new ValidationError(toErrorDetails(result.error));
  return result.data;
}

/** Validates query-string or path parameters. Malformed parameters are a 400 Bad Request. */
export function validateParams<S extends z.ZodType>(
  schema: S,
  params: unknown,
  message = 'Invalid request parameters',
): z.output<S> {
  const result = schema.safeParse(params);
  if (!result.success) throw new BadRequestError(message, toErrorDetails(result.error));
  return result.data;
}
