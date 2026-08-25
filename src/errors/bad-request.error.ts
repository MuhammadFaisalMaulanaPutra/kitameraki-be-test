import { AppError } from '@/errors/app-error'
import status from 'http-status'
export class BadRequestError extends AppError {
  readonly statusCode = status.BAD_REQUEST
  readonly errorCode = status['400_NAME']

  constructor(message: string, details: unknown = null) {
    super(message, details)
  }
}
