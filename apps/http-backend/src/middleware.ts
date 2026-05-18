import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError, JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

interface UserPayload extends JwtPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction ) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decodedData = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.userId = decodedData.userId;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
