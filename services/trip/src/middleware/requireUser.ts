import { Request, Response, NextFunction } from "express";

/**
 * Gate that requires a trusted `X-User-Id` header (set upstream by the API
 * gateway after it verifies the JWT — this service trusts the gateway and
 * does not re-verify). Rejects with 401 if absent. On success, attaches the
 * id to `req.userId` so downstream handlers don't re-read the header.
 */
const requireUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers["x-user-id"];
  if (!userId || typeof userId !== "string") {
    return res.status(401).json({
      success: false,
      message: "authentication required",
    });
  }
  req.userId = userId;
  next();
};

export { requireUser };
