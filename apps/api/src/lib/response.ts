import type { Response } from "express";
import { StatusCodes } from "http-status-codes";

export function success(
  res: Response,
  status: number,
  message: string,
  data?: unknown,
) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function created(res: Response, message: string, data?: unknown) {
  return success(res, StatusCodes.CREATED, message, data);
}
