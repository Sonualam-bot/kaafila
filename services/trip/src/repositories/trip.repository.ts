import { query } from "../db.js";

// NOTE on identity columns: host_id (trips) and user_id (trip_members) are
// user ids that originate in the AUTH service, delivered here via the gateway's
// X-User-Id header. They are deliberately NOT foreign keys to a users table —
// users live in a different service's database (auth_db), and Postgres FKs
// can't span databases. The only FK in this schema is trip_members.trip_id ->
// trips.id (same DB). That's the database-per-service trade-off.

interface Trip {
  id: string;
  host_id: string;
  title: string;
  status: string;
  created_at: Date;
}

interface TripMember {
  user_id: string;
  role: string;
  joined_at: Date;
}

/** Insert a trip row and return it (status defaults to 'planned' in the DB). */
export const createTrip = async ({
  hostId,
  title,
}: {
  hostId: string;
  title: string;
}) => {
  const trip = await query(
    "INSERT INTO trips (host_id, title) VALUES ($1, $2) RETURNING id, host_id, title, status, created_at",
    [hostId, title],
  );

  return trip.rows[0] as Trip;
};

/** Add a user to a trip with the given role. Caller ensures no duplicate. */
export const addMember = async ({
  tripId,
  userId,
  role,
}: {
  tripId: string;
  userId: string;
  role: string;
}) => {
  await query(
    "INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)",
    [tripId, userId, role],
  );
};

/** All trips a user belongs to (via membership), newest first. */
export const findTripsForUser = async (userId: string) => {
  const trips = await query(
    "SELECT t.id, t.host_id, t.title, t.status, t.created_at FROM trips t JOIN trip_members m ON m.trip_id = t.id WHERE m.user_id = $1 ORDER BY t.created_at DESC",
    [userId],
  );

  return trips.rows as Trip[];
};

/** Look up one trip by id; returns undefined if not found. */
export const findTripById = async (tripId: string) => {
  const trip = await query(
    "SELECT id, host_id, title, status, created_at FROM trips WHERE id = $1",
    [tripId],
  );

  return trip.rows[0] as Trip | undefined;
};

/** All member rows for a trip. */
export const findMembers = async (tripId: string) => {
  const members = await query(
    "SELECT user_id, role, joined_at FROM trip_members WHERE trip_id = $1",
    [tripId],
  );
  return members.rows as TripMember[];
};

/** Flip a trip's status and return the updated row (undefined if no such trip). */
export const updateTripStatus = async (tripId: string, status: string) => {
  const trip = await query(
    "UPDATE trips SET status = $2 WHERE id = $1 RETURNING id, host_id, title, status, created_at",
    [tripId, status],
  );

  return trip.rows[0] as Trip | undefined;
};
