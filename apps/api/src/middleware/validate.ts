import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Keep the standard { success, message, data } envelope so clients can
      // handle every error the same way.
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        data: { errors: result.error.flatten().fieldErrors },
      });
    }

    req.body = result.data;

    next();
  };
