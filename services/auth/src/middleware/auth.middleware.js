/**
  A middleware (req, res, next) that:
  1. Reads req.headers.authorization.
  2. If absent or doesn't start with "Bearer " → next(new ApiError(401, "authentication required")) and return.
  3. Extracts the token (the part after "Bearer ").
  4. In a try/catch: const decoded = jwt.verify(token, process.env.JWT_SECRET).
  5. On success: req.userId = decoded.userId; next();
  6. On catch: next(new ApiError(401, "invalid or expired token")).
 */

import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return next(new ApiError(401, "authentication required"));
  }
  const token = auth.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new ApiError(401, "invalid or expired token"));
  }
  req.userId = decoded.userId;
  next();
};

export { authenticate };
