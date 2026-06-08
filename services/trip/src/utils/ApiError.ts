/**
 * Operational error carrying an HTTP status code. Throw this anywhere in a
 * request flow; asyncHandler forwards it to errorHandler, which turns
 * statusCode/message/errors into the response. Extends Error so stack
 * traces and `instanceof Error` still work.
 */
class ApiError extends Error {
  statusCode: number;
  data: null;
  success: boolean;
  errors: unknown[];

  /**
   * @param statusCode  HTTP status to send (e.g. 400, 404).
   * @param message     Human-readable message; safe to show clients for 4xx.
   * @param errors      Optional field-level details (e.g. validation errors).
   * @param stack       Optional pre-captured stack; omit to capture here.
   */
  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: unknown[] = [],
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
