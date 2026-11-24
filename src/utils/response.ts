import type { Response } from 'express';
import type { ErrorDetail } from './errors';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: ErrorDetail[];
  };
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: PaginationMeta,
): void {
  const body: SuccessResponse<T> = { success: true, message, data, ...(meta && { meta }) };
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
): void {
  const body: ErrorResponse = {
    success: false,
    message,
    error: { code, ...(details && details.length > 0 ? { details } : {}) },
  };
  res.status(statusCode).json(body);
}
