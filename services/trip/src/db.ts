import pkg from "pg";
const { Pool } = pkg;

/**
 * Single shared connection pool for the trip service's Postgres database.
 * One pool per process — pg reuses connections instead of opening a new one
 * per query. Connection string comes from the TRIP_DB_URL env var.
 */
const pool = new Pool({ connectionString: process.env.TRIP_DB_URL });

/**
 * Run a parameterized SQL query against the pool.
 * Always pass values via `params` ($1, $2, ...) rather than string
 * interpolation — pg sends them separately, which prevents SQL injection.
 */
export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
