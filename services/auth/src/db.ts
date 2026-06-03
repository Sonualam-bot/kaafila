import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.AUTH_DB_URL });

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
