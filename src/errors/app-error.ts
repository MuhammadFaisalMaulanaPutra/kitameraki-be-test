import type { ErrorCode } from '@/constants/error-codes'

export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly errorCode: ErrorCode

  constructor(
    message: string,
    public readonly details: unknown = null
  ) {
    super(message)
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
