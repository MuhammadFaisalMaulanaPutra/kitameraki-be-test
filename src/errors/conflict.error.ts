import { ErrorCode } from '@/constants/error-codes'
import { AppError } from '@/errors/app-error'

export class ConflictError extends AppError {
  readonly statusCode = 409
  readonly errorCode = ErrorCode.CONFLICT

  constructor(message = 'The resource was modified by another request.', details: unknown = null) {
    super(message, details)
  }
}
