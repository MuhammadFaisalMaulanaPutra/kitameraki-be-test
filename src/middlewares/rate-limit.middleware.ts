import { rateLimit } from 'express-rate-limit';
import { sendError } from '../utils/response';

export function createRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later.'),
  });
}
