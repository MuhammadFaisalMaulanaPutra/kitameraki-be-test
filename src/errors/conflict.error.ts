import { AppError } from '@/errors/app-error'
import status from 'http-status'

export class ConflictError extends AppError {
  readonly statusCode = status.CONFLICT
  readonly errorCode = status['409_NAME']

  constructor(message = 'The resource was modified by another request.', details: unknown = null) {
    super(message, details)
  }
}
