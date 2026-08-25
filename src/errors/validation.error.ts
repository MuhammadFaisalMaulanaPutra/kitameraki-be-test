import { AppError } from '@/errors/app-error'
import status from 'http-status'

export interface ParamViolation {
  field: string
  message: string
}

export class ValidationError extends AppError {
  readonly statusCode = status.UNPROCESSABLE_ENTITY
  readonly errorCode = status['422_NAME']

  constructor(public readonly violations: ParamViolation[]) {
    super('Payload validation failed.', violations)
  }
}
