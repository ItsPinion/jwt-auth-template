import { StatusCodes } from "http-status-codes";

export class AppError extends Error {
  public readonly statusCode: number;

  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}