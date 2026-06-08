import { RequestHandler } from "express";

/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express's error handler via next(err). Without this, a thrown error
 * inside an async handler is an unhandled rejection that Express never
 * sees — the request would just hang. Wrap every async route in this.
 */
const asyncHandler = (requestHandler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
