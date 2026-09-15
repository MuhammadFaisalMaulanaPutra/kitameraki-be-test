export type AppErrorCode =
  | 'configuration_error'
  | 'database_conflict'
  | 'database_throttled'
  | 'database_unavailable'
  | 'internal_error'
  | 'invalid_json'
  | 'organization_forbidden'
  | 'organization_required'
  | 'payload_too_large'
  | 'settings_conflict'
  | 'task_conflict'
  | 'task_not_found'
  | 'unsupported_media_type'
  | 'validation_error';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const getCosmosStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { code?: number; statusCode?: number };
  return candidate.code ?? candidate.statusCode;
};

export const isCosmosNotFound = (error: unknown): boolean => getCosmosStatus(error) === 404;

export const isCosmosConflict = (error: unknown): boolean => {
  const status = getCosmosStatus(error);
  return status === 409 || status === 412;
};

export const mapCosmosError = (error: unknown): AppError | undefined => {
  const status = getCosmosStatus(error);
  if (status === undefined) return undefined;

  if (status === 429) {
    const retryAfterInMs =
      typeof error === 'object' && error !== null && 'retryAfterInMs' in error
        ? Number((error as { retryAfterInMs?: unknown }).retryAfterInMs)
        : undefined;
    const headers =
      retryAfterInMs && Number.isFinite(retryAfterInMs)
        ? { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterInMs / 1000))) }
        : undefined;
    return new AppError(
      503,
      'database_throttled',
      'The database is temporarily busy. Try again shortly.',
      undefined,
      headers,
    );
  }

  if ([408, 500, 502, 503, 504].includes(status)) {
    return new AppError(503, 'database_unavailable', 'The database is temporarily unavailable.');
  }

  if (status === 409 || status === 412) {
    return new AppError(409, 'database_conflict', 'The resource changed. Reload and try again.');
  }

  return undefined;
};
