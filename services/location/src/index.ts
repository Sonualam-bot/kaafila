/**
 * Location service — realtime rider tracking over WebSockets.
 *
 * Riders open one socket per trip (tripId via query string, identity via the
 * gateway-set `x-user-id` header). They stream GPS pings up; the server keeps
 * live positions per trip ("rooms"), computes a median group centroid + each
 * rider's lag, broadcasts the group snapshot back to every rider, and persists
 * each ping to loc-db for later trip replay.
 */
import "dotenv/config";
import express from "express";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { haversineDistanceMeters, median } from "./utils/geo.js";
import { query } from "./db.js";
import { insertPosition } from "./repositories/location.repository.js";
import { redis, sub } from "./redis.js";

/** A rider is "lagging" if they're more than this many metres from the group centroid. */
const LAG_THRESHOLD_M = 500;

/**
 * Recompute a trip's group state after a position change and broadcast it to
 * all connected riders.
 *
 * The centre is the per-axis MEDIAN of rider positions — robust to outliers, so
 * one rider sprinting far ahead can't drag the centre and false-flag the pack
 * (see utils/geo.median; needs 3+ riders to anchor). Each rider's lag is the
 * Haversine distance to that centre, flagged over LAG_THRESHOLD_M.
 *
 * Known gap (deferred): lag is undirected — a rider far *ahead* also flags. The
 * directional "behind" check needs the group's travel heading.
 */
async function evaluateTrip(tripId: string) {
  // only riders who have actually sent a position
  const raw = await redis.hgetall(`trip:${tripId}:positions`);
  const positions = Object.entries(raw).map(([userId, v]) => {
    const { lat, lng } = JSON.parse(v);
    return { userId, lat, lng };
  });

  if (positions.length === 0) return;

  // group centre = per-axis median (robust to one outlier dragging it)
  const cLat = median(positions.map((p) => p.lat));
  const cLng = median(positions.map((p) => p.lng));

  const riders = positions.map((p) => {
    const distance = Math.round(
      haversineDistanceMeters(p.lat, p.lng, cLat, cLng),
    );
    return {
      userId: p.userId,
      lat: p.lat,
      lng: p.lng,
      distance,
      lagging: distance > LAG_THRESHOLD_M,
    };
  });

  const payload = JSON.stringify({
    type: "positions",
    tripId,
    riders,
  });

  await redis.publish("positions", payload);
}

const app = express();
app.use(express.json());

const PORT = Number(process.env.LOCATION_PORT) || 3003;

/** Liveness probe. */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// One HTTP server shared by Express (routes) and ws (WS upgrades) — so HTTP and
// WebSocket live on the same port; ws performs the "upgrade" handshake on it.
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/** In-memory "rooms": tripId -> (userId -> Rider). Source of live positions (Redis in Wk5). */
const trips = new Map<string, Map<string, WebSocket>>();

/**
 * Per-connection lifecycle. The handshake carries identity: `tripId` (query) and
 * the gateway-verified `x-user-id` (header) — Location TRUSTS that header and does
 * NOT verify a JWT. Missing either → close with 1008 (the WS analogue of a 401).
 * On each ping: update the live position, persist it (fire-and-forget), then
 * re-evaluate + broadcast the trip. On close: leave the room.
 */
wss.on("connection", (socket, req) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const tripId = url.searchParams.get("tripId");
  const userId = req.headers["x-user-id"];

  if (!tripId || typeof userId !== "string") {
    socket.close(1008, "tripId (query) and x-user-id (header) required");
    return;
  }

  if (!trips.has(tripId)) trips.set(tripId, new Map());
  trips.get(tripId)!.set(userId, socket);

  console.log(
    `ride ${userId} joined trip ${tripId} (size=${trips.get(tripId)!.size}) `,
  );

  socket.on("message", async (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return; // ignore non-JSON frames
    }

    const { lat, lng } = msg;
    await redis.hset(
      `trip:${tripId}:positions`,
      userId,
      JSON.stringify({ lat, lng }),
    );

    // persist for replay — fire-and-forget so the socket isn't blocked on the DB
    insertPosition({
      tripId,
      userId,
      lat,
      lng,
    }).catch((e) => console.error("persist failed:", e));

    evaluateTrip(tripId).catch((e) => console.error("evaluate failed:", e));
  });

  socket.on("close", () => {
    trips.get(tripId)?.delete(userId);
    if (trips.get(tripId)?.size === 0) {
      trips.delete(tripId); // drop empty rooms
    }
    redis
      .hdel(`trip:${tripId}:positions`, userId)
      .catch((e) => console.error("hdel failed:", e));
    console.log(`rider ${userId} left trip ${tripId}`);
  });
});

await sub.subscribe("positions");
sub.on("message", (_channel, message) => {
  const { tripId } = JSON.parse(message);
  const room = trips.get(tripId);
  if (!room) return;
  for (const [, socket] of room) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
});

sub.on("error", (e) => console.error("Redis sub error: ", e.message));

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

await checkDbConnection();

server.listen(PORT, () => {
  console.log(`Location service (HTTP + WS) on http://localhost:${PORT}`);
});
