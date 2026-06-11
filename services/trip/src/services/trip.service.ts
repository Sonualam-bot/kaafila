import { ApiError } from "../utils/ApiError.js";
import {
  addMember,
  createTrip as createTripForUser,
  findMembers,
  findTripById,
  findTripsForUser,
  updateTripStatus,
} from "../repositories/trip.repository.js";
import { redis } from "../redis.js";

/**
 * Legal trip status transitions: each status maps to the statuses it may move to next. This table Is the rulebook - adding a state later means editing this map, not all four service functions. Note "planned" is the DB default for a new trip (see trip.repository.createTrip), not "created".
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  planned: ["started"],
  started: ["paused", "ended"],
  paused: ["started", "ended"],
  ended: [],
};

/**
 * Guard a status change. Pure - no DB, no awaits, just the rulebook.
 * Throws on an illegal move; returns nothing (void) when the move is legal,
 * so callers don't branch - they just fall through to the update
 * @throws ApiError 409 if `current -> desired` is not a legal transition
 */

export const assertTransition = (current: string, desired: string) => {
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(desired)) {
    throw new ApiError(409, `cannot move trip from "${current} to "${desired}`);
  }
};

/**
 * Create a trip and enroll its creator as the first member (role "host").
 * @throws ApiError 400 if the title is empty or whitespace-only.
 */
export const createTrip = async ({
  hostId,
  title,
}: {
  hostId: string;
  title: string;
}) => {
  if (!title?.trim()) {
    throw new ApiError(400, "title cannot be empty");
  }

  const trip = await createTripForUser({ hostId, title });
  await addMember({ tripId: trip.id, userId: hostId, role: "host" });
  return trip;
};

/** List every trip the given user is a member of, newest first. */
export const getMyTrips = async (userId: string) => {
  const tripsForUser = await findTripsForUser(userId);
  return tripsForUser;
};

/**
 * Fetch a single trip together with its member list.
 * @throws ApiError 404 if no trip with that id exists.
 */
export const getTrip = async ({ tripId }: { tripId: string }) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }
  const members = await findMembers(tripId);
  return { trip, members };
};

/**
 * Add a user to an existing trip as a "rider".
 * @throws ApiError 404 if the trip doesn't exist.
 * @throws ApiError 409 if the user is already a member (DB unique-violation 23505).
 * @returns the trip's updated member list.
 */
export const joinTrip = async ({
  tripId,
  userId,
}: {
  tripId: string;
  userId: string;
}) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }

  try {
    await addMember({ tripId, userId, role: "rider" });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new ApiError(409, "already a member of this trip");
    }
    throw error;
  }

  return findMembers(tripId);
};

/**
 * End a trip. Only the host may do this.
 *
 * @throws ApiError 404 if no trip with that id exists.
 * @throws ApiError 403 if the requester is not the trip's host.
 * @returns the updated trip row (status now "ended").
 */
export const endTrip = async ({
  tripId,
  userId,
}: {
  tripId: string;
  userId: string;
}) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }

  if (trip.host_id !== userId) {
    throw new ApiError(403, "only the host can end the trip");
  }

  assertTransition(trip.status, "ended");

  const updated = await updateTripStatus(tripId, "ended");
  redis
    .publish(
      "trip-events",
      JSON.stringify({
        type: "trip-ended",
        tripId,
      }),
    )
    .catch((e) => console.error("publish trip-ended failed:", e));
  return updated;
};

/**
 * Start a trip. Only the host may do this.
 *
 * @throws ApiError 404 if no trip with that id exists.
 * @throws ApiError 403 if the requester is not the trip's host.
 * @returns the updated trip row (status now "started").
 */

export const startTrip = async ({
  userId,
  tripId,
}: {
  userId: string;
  tripId: string;
}) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }

  if (trip.host_id !== userId) {
    throw new ApiError(403, "only the host can start the trip");
  }

  assertTransition(trip.status, "started");

  const updated = await updateTripStatus(tripId, "started");
  redis
    .publish(
      "trip-events",
      JSON.stringify({
        type: "trip-started",
        tripId,
      }),
    )
    .catch((e) => console.error("publish trip-start failed:", e));
  return updated;
};

/**
 * Pause a trip mid-ride. Only the host may do this.
 * @throws ApiError 404 if no such trip, 403 if not the host,
 *         409 if the trip isn't currently "started".
 */
export const pauseTrip = async ({
  tripId,
  userId,
}: {
  tripId: string;
  userId: string;
}) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }

  if (trip.host_id !== userId) {
    throw new ApiError(403, "only the host can pause the trip");
  }

  assertTransition(trip.status, "paused");

  const updated = await updateTripStatus(tripId, "paused");
  redis
    .publish("trip-events", JSON.stringify({ type: "trip-paused", tripId }))
    .catch((e) => console.error("publish trip-paused failed:", e));
  return updated;
};

/**
 * Resume a paused trip. Only the host may do this.
 * @throws ApiError 404 if no such trip, 403 if not the host,
 *         409 if the trip isn't currently "paused".
 */
export const resumeTrip = async ({
  tripId,
  userId,
}: {
  tripId: string;
  userId: string;
}) => {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw new ApiError(404, "trip not found");
  }

  if (trip.host_id !== userId) {
    throw new ApiError(403, "only the host can resume the trip");
  }

  assertTransition(trip.status, "started");

  const updated = await updateTripStatus(tripId, "started");
  redis
    .publish("trip-events", JSON.stringify({ type: "trip-resumed", tripId }))
    .catch((e) => console.error("publish trip-resumed failed:", e));
  return updated;
};
