import { ApiError } from "../utils/ApiError.js";
import {
  addMember,
  createTrip as createTripForUser,
  findMembers,
  findTripById,
  findTripsForUser,
} from "../repositories/trip.repository.js";

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
