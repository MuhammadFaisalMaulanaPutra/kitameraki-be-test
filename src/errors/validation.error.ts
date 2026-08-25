import { ErrorCode } from '@/constants/error-codes'
import { AppError } from '@/errors/app-error'

export interface ParamViolation {
  field: string
  message: string
}

export class ValidationError extends AppError {
  readonly statusCode = 422
  readonly errorCode = ErrorCode.VALIDATION_ERROR

  constructor(public readonly violations: ParamViolation[]) {
    super('Payload validation failed.', violations)
  }
}
