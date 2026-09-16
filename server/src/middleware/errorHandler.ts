import type { ErrorResponse } from "@g-bank/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "pino";
import { AppError, NotFoundError } from "../lib/errors.ts";

// Runs when no route matched the URL.
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("That route doesn't exist."));
};

// Express treats a middleware with 4 parameters as the error handler.
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    // Half 1: which note do we trust?
    const appError =
      err instanceof AppError
        ? err
        : new AppError(
            500,
            "internal_error",
            "Something went wrong on our side. Please try again.",
          );

    if (appError.status >= 500) {
      logger.error({ err, requestId: req.id }, "unhandled error");
    }

    // Half 2: write the reply in the standard shape.
    const body: ErrorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        requestId: String(req.id),
        ...(appError.meta ? { meta: appError.meta } : {}),
      },
    };
    res.status(appError.status).json(body);
  };
}
