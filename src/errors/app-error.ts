export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly errorCode: string

  constructor(
    message: string,
    public readonly details: unknown = null
  ) {
    super(message)
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
