// ───── APP ERROR ──────────────────────────────

export class AppError extends Error {
  public readonly status: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    status: number = 500,
    isOperational: boolean = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = 'AppError';
    this.status = status;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
