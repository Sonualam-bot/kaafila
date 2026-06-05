import jwt from "jsonwebtoken";
import crypto from "node:crypto";

/** Shape of the data embedded in (and read back out of) an access token. */
export interface TokenPayload {
  userId: string;
}

/** How long a refresh token stays valid, in days. Drives both the JWT expiry and the stored expiresAt. */
const REFRESH_TTL_DAYS = 7;

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

/**
 * Hash a token with SHA-256 for safe storage.
 * We persist the *hash* of a refresh token in the DB, never the token itself —
 * so a database leak can't be replayed to mint new access tokens.
 * @param token - The raw token string to hash.
 * @returns The hex-encoded SHA-256 digest.
 */
export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Sign a long-lived refresh token (uses a SEPARATE secret from the access token).
 * @param userId - The user's id to embed in the token.
 * @returns The signed token plus its absolute expiry, to persist alongside the stored hash.
 */
export const signRefreshToken = (userId: string) => {
  const token = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: `${REFRESH_TTL_DAYS}d`,
      jwtid: crypto.randomUUID(), // ← unique per token → unique hash, no collisions
    },
  );
  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  return { token, expiresAt };
};

/**
 * Verify and decode a refresh token using the refresh secret.
 * @param token - The raw refresh JWT string.
 * @returns The decoded token payload.
 * @throws {JsonWebTokenError} If the signature is invalid or malformed.
 * @throws {TokenExpiredError} If the token has expired.
 */
export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as TokenPayload;
