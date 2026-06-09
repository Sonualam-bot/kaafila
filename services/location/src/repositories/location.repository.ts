import { query } from "../db.js";

/**
 * Append one GPS ping to the locations history (used later for trip replay).
 * trip_id / user_id are opaque text ids from upstream — no FK, since users and
 * trips live in other services' databases (database-per-service).
 */
export const insertPosition = async ({
  tripId,
  userId,
  lat,
  lng,
}: {
  tripId: string;
  userId: string;
  lat: number;
  lng: number;
}) => {
  await query(
    "INSERT INTO locations (trip_id, user_id, lat, lng) VALUES ($1, $2, $3, $4)",
    [tripId, userId, lat, lng],
  );
};
