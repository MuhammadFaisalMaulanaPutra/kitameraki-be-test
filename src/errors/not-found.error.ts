import { AppError } from '@/errors/app-error'
import status from 'http-status'

export class NotFoundError extends AppError {
  readonly statusCode = status.NOT_FOUND
  readonly errorCode = status['404_NAME']

  constructor(resource: string, identifier: string | Array<string>) {
    super(
      `${resource} with identifier '${Array.isArray(identifier) ? identifier.join(', ') : identifier}' was not found.`
    )
  }
}
