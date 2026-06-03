import { query } from "../db.js";

interface User {
  id: string;
  email: string;
  created_at: Date;
}

export const createUser = async ({
  email,
  password_hash,
}: {
  email: string;
  password_hash: string;
}) => {
  const user = await query(
    "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email, created_at",
    [email, password_hash],
  );

  return user.rows[0] as User;
};

export const findByEmail = async ({ email }: { email: string }) => {
  const user = await query(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
    [email],
  );
  return user.rows[0] as User & { password_hash: string };
};

export const findById = async ({ userId }: { userId: string }) => {
  const user = await query(
    "SELECT id, email, created_at FROM users WHERE id = $1",
    [userId],
  );
  return user.rows[0] as User;
};
