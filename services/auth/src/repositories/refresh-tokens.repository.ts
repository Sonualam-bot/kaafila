import { query } from "../db.js";

/** A stored refresh-token record (only the columns callers need). */
interface RefreshTokenRow {
  user_id: string;
  expires_at: Date;
}

/**
 * Persist a refresh token for a user. Stores the token's SHA-256 hash, never
 * the raw token, so a DB leak can't be replayed.
 * @param userId    - The owning user's id (FK to users.id).
 * @param tokenHash - SHA-256 hash of the refresh token.
 * @param expiresAt - Absolute expiry, kept in sync with the token's JWT exp.
 */
export const storeRefreshToken = async ({
  userId,
  tokenHash,
  expiresAt,
}: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) => {
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
};

/**
 * Look up a stored refresh token by its hash.
 * @param tokenHash - SHA-256 hash of the refresh token to find.
 * @returns The row, or `undefined` if absent — i.e. revoked or never issued.
 */
export const findRefreshToken = async ({
  tokenHash,
}: {
  tokenHash: string;
}) => {
  const result = await query(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash],
  );

  return result.rows[0] as RefreshTokenRow | undefined;
};

/**
 * Delete a stored refresh token by its hash — this is how logout/revocation
 * works: once the row is gone, the token can no longer mint access tokens.
 * @param tokenHash - SHA-256 hash of the refresh token to revoke.
 */
export const deleteRefreshToken = async ({
  tokenHash,
}: {
  tokenHash: string;
}) => {
  await query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
};
