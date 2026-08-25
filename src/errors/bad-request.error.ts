import { ErrorCode } from '@/constants/error-codes'
import { AppError } from '@/errors/app-error'

export class BadRequestError extends AppError {
  readonly statusCode = 400
  readonly errorCode = ErrorCode.BAD_REQUEST

  constructor(message: string, details: unknown = null) {
    super(message, details)
  }
}
