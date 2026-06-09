import "dotenv/config";
import express from "express";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { haversineDistanceMeters, median } from "./utils/geo.js";

const LAG_THRESHOLD_M = 500;

function evaluateTrip(tripId: string) {
  const room = trips.get(tripId);
  if (!room) return;

  /**only riders who have sent position */
  const located = [...room.entries()].filter(
    ([, r]) => r.lat != null && r.lng != null,
  );
  if (located.length === 0) return;

  /**centroid = mean of all positions (simple version - we'all see it break on the sprinter case) */
  const cLat = median(located.map(([, r]) => r.lat!));
  const cLng = median(located.map(([, r]) => r.lng!));

  for (const [userId, r] of located) {
    const dist = haversineDistanceMeters(r.lat!, r.lng!, cLat, cLng);
    const lagging = dist > LAG_THRESHOLD_M;
    console.log(
      `  ${userId}: ${Math.round(dist)}m from centroid${lagging ? "  ⚠ LAGGING" : ""}`,
    );
  }
}

const app = express();
app.use(express.json());

const PORT = Number(process.env.LOCATION_PORT) || 3003;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

type Rider = {
  socket: WebSocket;
  lat?: number;
  lng?: number;
};

const trips = new Map<string, Map<string, Rider>>();

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
      return;
    }

    const { lat, lng } = msg;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const rider = trips.get(tripId)!.get(userId)!;
    rider.lat = lat;
    rider.lng = lng;
    console.log(`pos ${userId}@${tripId}: ${lat}, ${lng} `);
    evaluateTrip(tripId);
  });

  socket.on("close", () => {
    trips.get(tripId)?.delete(userId);
    if (trips.get(tripId)?.size === 0) {
      trips.delete(tripId);
    }
    console.log(`rider ${userId} left trip ${tripId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Location service (HTTP + WS) on http://localhost:${PORT}`);
});
