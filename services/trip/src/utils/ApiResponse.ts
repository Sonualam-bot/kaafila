/**
 * Uniform success-response envelope so every endpoint returns the same
 * shape. `success` is derived from the status code (< 400 = true), so it
 * can't drift out of sync with the status you pass.
 */
class ApiResponse {
  statusCode: number;
  data: unknown;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: unknown, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
