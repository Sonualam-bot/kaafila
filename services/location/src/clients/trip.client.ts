/**
 * Checks whether a given user is a member of a given trip, by asking the
 * Trip service (the source of truth for trip membership).
 *
 * Used by the Location service to authorize realtime access: a rider should
 * only receive a trip's live positions if they actually belong to that trip.
 *
 * Fails **closed** — any error (network failure, non-2xx response, malformed
 * body, Trip service down) results in `false`, never a thrown exception. A
 * membership check that can't be completed must be treated as "not a member,"
 * so an outage can never accidentally grant access.
 *
 * @param tripId - The trip to check membership against.
 * @param userId - The user whose membership is in question. Sent to the Trip
 *                 service as the trusted `x-user-id` header.
 * @returns `true` only if the Trip service confirms the user is a member;
 *          `false` in every other case (not a member, or any failure).
 */
export const isTripMember = async (
  tripId: string,
  userId: string,
): Promise<boolean> => {
  if (!tripId || typeof userId !== "string") {
    return false; // bad input → fail closed, same as any other failure
  }

  try {
    const res = await fetch(`${process.env.TRIP_SERVICE_URL}/${tripId}`, {
      headers: { "x-user-id": userId },
    });

    if (!res.ok) return false; // 404 trip-not-found, 401, 5xx, etc.

    // res.json() is typed `unknown` — narrow it to the shape we depend on.
    const body = (await res.json()) as {
      data?: { members?: { user_id: string }[] };
    };
    const members = body.data?.members ?? []; // missing/malformed → empty → false

    return members.some((m) => m.user_id === userId);
  } catch {
    return false; // network error, JSON parse error, undefined body — all fail closed
  }
};
