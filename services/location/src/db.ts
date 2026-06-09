import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.LOCATION_DB_URL,
});

/**
 * Run a query on the pooled pg client. Always pass user input via `params`
 * ($1, $2, …) — never string-concatenated — to prevent SQL injection.
 */
export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
