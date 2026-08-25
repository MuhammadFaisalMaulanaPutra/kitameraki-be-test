import { ErrorCode } from '@/constants/error-codes'
import { AppError } from '@/errors/app-error'

export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly errorCode = ErrorCode.RESOURCE_NOT_FOUND

  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier '${identifier}' was not found.`)
  }
}
