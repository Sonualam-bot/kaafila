import "dotenv/config";
import express from "express";
import { query } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router as tripRouter } from "./routes/trip.routes.js";

const app = express();
app.use(express.json());
const port = Number(process.env.TRIP_PORT || 3002);

/**
 * Fail fast on startup: run a trivial `SELECT 1` to confirm the DB is
 * reachable. If it fails, log and exit(1) so the process doesn't sit
 * accepting requests it can't serve. Called before app.listen().
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

/** Liveness probe. Returns 200 so orchestrators know the process is up. */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(tripRouter);

await checkDbConnection();

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Trip service listening on http://localhost:${port}`);
});
