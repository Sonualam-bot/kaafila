import { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };

    req.headers["x-user-id"] = decoded.userId;
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "invalid or expired token",
    });
  }
  next();
};

export { verifyToken };
