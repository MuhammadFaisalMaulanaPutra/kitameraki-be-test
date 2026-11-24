import type { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../utils/errors';
import { uuidSchema } from '../validators/common.validator';

declare module 'express-serve-static-core' {
  interface Request {
    organizationId?: string;
  }
}

export const ORGANIZATION_HEADER = 'x-organization-id';

/**
 * Resolves the tenant (organization) of the request.
 * Every query is scoped to this id, and clients can never choose it through the request body.
 * In production this would be derived from the authenticated user's token claims instead of a header.
 */
export function organizationContext(req: Request, _res: Response, next: NextFunction): void {
  const value = req.header(ORGANIZATION_HEADER);
  if (!value) throw new BadRequestError(`Missing required "${ORGANIZATION_HEADER}" header`);

  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new BadRequestError(`"${ORGANIZATION_HEADER}" header must be a valid UUID`);

  req.organizationId = parsed.data;
  next();
}

export function getOrganizationId(req: Request): string {
  if (!req.organizationId) throw new Error('organizationContext middleware is not registered for this route');
  return req.organizationId;
}
