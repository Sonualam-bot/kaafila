import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return next(new ApiError(401, "authentication required"));
  }
  const token = auth.split(" ")[1];

  let decoded: { userId: string };

  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    return next(new ApiError(401, "invalid or expired token"));
  }
  req.userId = decoded.userId;
  next();
};

export { authenticate };
