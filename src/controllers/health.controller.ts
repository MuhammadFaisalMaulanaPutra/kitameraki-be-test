import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export class HealthController {
  check = (_req: Request, res: Response): void => {
    sendSuccess(res, 200, 'Service is healthy', {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };
}
