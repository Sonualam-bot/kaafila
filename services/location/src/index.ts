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
import {
  angularDifference,
  bearing,
  haversineDistanceMeters,
  median,
} from "./utils/geo.js";
import { query } from "./db.js";
import { insertPosition } from "./repositories/location.repository.js";
import { redis, sub } from "./redis.js";
import { isTripMember } from "./clients/trip.client.js";

/** A rider is "lagging" if they're more than this many metres from the group centroid. */
const LAG_THRESHOLD_M = 500;
const MIN_MOVE_M = 10;

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

  /**
   * read the previous centroid (shared, so any instance sees the same heading)
   */
  const prevRaw = await redis.get(`trip:${tripId}:centroid`);
  const prev = prevRaw ? JSON.parse(prevRaw) : null;

  /**
   * travel direction = bearing from where the group's center WAS to where it is now.
   * Only trust it if the centre actually moved more than GPS jitter - otherwise a "stationary" group produces a random heading. null = direction unknown
   */

  let travelBearing: number | null = null;
  if (
    prev &&
    haversineDistanceMeters(prev.lat, prev.lng, cLat, cLng) > MIN_MOVE_M
  ) {
    travelBearing = bearing(prev.lat, prev.lng, cLat, cLng);
  }

  /**
   * remember the current centre for the next time
   */
  await redis.set(
    `trip:${tripId}:centroid`,
    JSON.stringify({
      lat: cLat,
      lng: cLng,
    }),
  );

  const riders = positions.map((p) => {
    const distance = Math.round(
      haversineDistanceMeters(p.lat, p.lng, cLat, cLng),
    );

    let status: "with-group" | "ahead" | "behind";
    if (distance <= LAG_THRESHOLD_M) {
      status = "with-group";
    } else if (travelBearing === null) {
      status = "behind";
    } else {
      const toRider = bearing(cLat, cLng, p.lat, p.lng);
      status =
        angularDifference(toRider, travelBearing) > 90 ? "behind" : "ahead";
    }

    return {
      userId: p.userId,
      lat: p.lat,
      lng: p.lng,
      distance,
      status,
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
wss.on("connection", async (socket, req) => {
  // 1. Identity from the handshake. req.url is only the path+query
  //    ("/...?tripId=t1"), so parse it against a throwaway base — we just want
  //    the query params. userId arrives in the gateway-injected header.
  const url = new URL(req.url ?? "", "http://localhost");
  const tripId = url.searchParams.get("tripId");
  const userId = req.headers["x-user-id"];

  // 2. Authentication gate — no trip or no identity → refuse the connection.
  //    1008 ("policy violation") is the WebSocket equivalent of an HTTP 401.
  if (!tripId || typeof userId !== "string") {
    socket.close(1008, "tripId (query) and x-user-id (header) required");
    return;
  }

  // 3. Authorization gate — ask the Trip service whether this rider actually
  //    belongs to this trip (service-to-service call; fails closed). Checked
  //    BEFORE joining the room, so an unauthorized socket never lands in
  //    `trips` and never receives a single broadcast.
  const allowed = await isTripMember(tripId, userId);
  if (!allowed) {
    socket.close(1008, "not a member of this trip");
    return;
  }

  // 4. Authorized → join this trip's room (this instance's local set of
  //    sockets for the trip). Create the room map lazily on the first rider.
  if (!trips.has(tripId)) trips.set(tripId, new Map());
  trips.get(tripId)!.set(userId, socket);

  console.log(
    `ride ${userId} joined trip ${tripId} (size=${trips.get(tripId)!.size}) `,
  );

  // 5. Each GPS ping from this rider. `data` is raw bytes off the socket
  //    (a Buffer) → string → JSON; non-JSON frames are ignored.
  socket.on("message", async (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return; // ignore non-JSON frames
    }

    const { lat, lng } = msg;

    // Write this rider's live position into the SHARED Redis hash. Awaited so
    // the new position is in place before evaluateTrip reads the group back.
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

    // recompute the group centroid/lag + publish the snapshot. Not awaited —
    // runs concurrently with the persist above; errors are logged, not thrown.
    evaluateTrip(tripId).catch((e) => console.error("evaluate failed:", e));
  });

  // 6. Disconnect cleanup: leave the local room AND drop this rider from the
  //    shared Redis hash, so the centroid stops counting a rider who's gone.
  socket.on("close", () => {
    trips.get(tripId)?.delete(userId);
    if (trips.get(tripId)?.size === 0) {
      trips.delete(tripId); // drop empty rooms so the map can't grow forever
      //trip is over - remove the heading key too (it has no auto-cleanup)
      //like the positions hash does, so it would otherwise linger in Redis
      redis
        .del(`trip:${tripId}:centroid`)
        .catch((e) => console.error("centroid del failed: ", e));
    }
    redis
      .hdel(`trip:${tripId}:positions`, userId)
      .catch((e) => console.error("hdel failed:", e));
    console.log(`rider ${userId} left trip ${tripId}`);
  });
});

// FAN-OUT side. Every instance subscribes to the one "positions" channel.
// evaluateTrip (on any instance) publishes a snapshot there; here we receive it
// and relay it to THIS instance's local sockets for that trip. That's what makes
// the broadcast cross-instance: a ping on instance A reaches riders on instance B.
await sub.subscribe("positions");
sub.on("message", (_channel, message) => {
  const { tripId } = JSON.parse(message);
  const room = trips.get(tripId); // only this instance's sockets for the trip
  if (!room) return; // no local riders in this trip → nothing to do
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
