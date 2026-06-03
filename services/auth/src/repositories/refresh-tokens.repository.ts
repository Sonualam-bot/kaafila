import { query } from "../db.js";

interface RefreshTokenRow {
  user_id: string;
  expires_at: Date;
}

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
