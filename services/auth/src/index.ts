/**
 * Auth service entrypoint — wires up the app: global middleware, routes,
 * the error handler, the startup DB check, and the HTTP listener.
 */
import "dotenv/config";
import express from "express";
import { query } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router as appRouter } from "./routes/auth.routes.js";

const app = express();
app.use(express.json());
const port = Number(process.env.AUTH_PORT) || 3001;

/**
 * Verify the service can reach Postgres before accepting traffic.
 * On failure, crash the process (exit 1) so the container restarts instead
 * of serving requests against a dead database.
 */
async function checkDbConnection() {
  try {
    await query("SELECT 1");
    console.log("DB Connection ok");
  } catch (error) {
    console.error("DB Connection FAILED: ", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Liveness probe.
 * @route GET /health
 * @returns {200} { status: "ok" }
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

//routes
app.use(appRouter);

// Error-handling middleware
app.use(errorHandler);

await checkDbConnection();
app.listen(port, () => {
  console.log(`Server is listening to port http://localhost:${port}`);
});
