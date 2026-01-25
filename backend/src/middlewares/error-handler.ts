import type { Request, Response, NextFunction } from "express";
import { AppError } from "../domain/errors";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: {
          fieldErrors: err.details?.fieldErrors ?? {},
          meta: { ...(err.details?.meta ?? {}), requestId }
        }
      }
    });
  }

  // Fallback
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: { fieldErrors: {}, meta: { requestId } }
    }
  });
}
