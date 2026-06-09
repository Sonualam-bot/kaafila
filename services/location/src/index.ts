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
function evaluateTrip(tripId: string) {
  const room = trips.get(tripId);
  if (!room) return;

  // only riders who have actually sent a position
  const located = [...room.entries()].filter(
    ([, r]) => r.lat != null && r.lng != null,
  );
  if (located.length === 0) return;

  // group centre = per-axis median (robust to one outlier dragging it)
  const cLat = median(located.map(([, r]) => r.lat!));
  const cLng = median(located.map(([, r]) => r.lng!));

  const riders = located.map(([userId, r]) => {
    const distance = Math.round(
      haversineDistanceMeters(r.lat!, r.lng!, cLat, cLng),
    );
    return {
      userId,
      lat: r.lat!,
      lng: r.lng!,
      distance,
      lagging: distance > LAG_THRESHOLD_M,
    };
  });

  const payload = JSON.stringify({
    type: "positions",
    tripId,
    riders,
  });

  // broadcast the snapshot to every open socket in this trip
  for (const [, r] of room) {
    if (r.socket.readyState === WebSocket.OPEN) {
      r.socket.send(payload);
    }
  }
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

/** A connected rider: their socket + latest known position (unset until first ping). */
type Rider = {
  socket: WebSocket;
  lat?: number;
  lng?: number;
};

/** In-memory "rooms": tripId -> (userId -> Rider). Source of live positions (Redis in Wk5). */
const trips = new Map<string, Map<string, Rider>>();

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
  trips.get(tripId)!.set(userId, { socket });

  console.log(
    `ride ${userId} joined trip ${tripId} (size=${trips.get(tripId)!.size}) `,
  );

  socket.on("message", (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return; // ignore non-JSON frames
    }

    const { lat, lng } = msg;
    if (typeof lat !== "number" || typeof lng !== "number") return; // ignore bad pings
    const rider = trips.get(tripId)!.get(userId)!;
    rider.lat = lat;
    rider.lng = lng;

    // persist for replay — fire-and-forget so the socket isn't blocked on the DB
    insertPosition({
      tripId,
      userId,
      lat,
      lng,
    }).catch((e) => console.error("persist failed:", e));

    evaluateTrip(tripId);
  });

  socket.on("close", () => {
    trips.get(tripId)?.delete(userId);
    if (trips.get(tripId)?.size === 0) {
      trips.delete(tripId); // drop empty rooms
    }
    console.log(`rider ${userId} left trip ${tripId}`);
  });
});

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
