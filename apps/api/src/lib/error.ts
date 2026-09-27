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

/** Postgres SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Detects a database unique-constraint violation (e.g. two concurrent
 * registrations racing past the application-level duplicate check).
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  return code === UNIQUE_VIOLATION;
}