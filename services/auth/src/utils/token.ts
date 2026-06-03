import jwt from "jsonwebtoken";

/** Shape of the data embedded in (and read back out of) an access token. */
export interface TokenPayload {
  userId: string;
}

/**
 * Sign a short-lived access token carrying the user's id.
 * Centralizes the secret + expiry in one place so the issuing sites
 * (signup, login) can't drift apart.
 * @param userId - The user's id to embed in the token.
 * @returns A signed JWT string (expires in 30m).
 */
export const signAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "30m",
  });
};

/**
 * Verify and decode an access token using the shared secret.
 * @param token - The raw JWT string (without the "Bearer " prefix).
 * @returns The decoded token payload.
 * @throws {JsonWebTokenError} If the signature is invalid or malformed.
 * @throws {TokenExpiredError} If the token has expired.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
};
