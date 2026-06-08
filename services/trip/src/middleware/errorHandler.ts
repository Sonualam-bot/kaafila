import { ErrorRequestHandler } from "express";

/**
 * Central Express error handler. Mounted LAST (after all routes) so any
 * `throw` / `next(err)` lands here and becomes a consistent JSON response.
 * Uses err.statusCode when present (e.g. ApiError), else 500. On 500 the
 * real error is logged but hidden from the client to avoid leaking internals.
 *
 * Note: the 4-argument signature (err, req, res, next) is how Express
 * recognizes this as an error handler — all four params are required even
 * if unused.
 */
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  // Don't leak internal error details to the client on unexpected (500) errors.
  // The real error is logged above (console.error); the client gets a generic message.
  const message = statusCode === 500 ? "Something went wrong" : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors,
  });
};

export { errorHandler };
