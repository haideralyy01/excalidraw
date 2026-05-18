import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

interface userPayload extends JwtPayload {
    userId: string;
}

export const authenticateWebSocket = (token: string): userPayload | null => {
    if (!token) {
        return null;
    }
    try {
        const decodedData = jwt.verify(token, JWT_SECRET) as userPayload;
        return decodedData;
    } catch (err) {
        console.error("JWT verification failed:", err);
        return null;
    }
};