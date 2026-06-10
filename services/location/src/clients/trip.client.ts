/**
 * Ask the Trip service (the source of truth) about a rider's access to a trip:
 * whether they're a member, and the trip's current status.
 *
 * Used by the Location service to authorize realtime access on connect — a rider
 * may join a trip's live feed only if they belong to it AND it hasn't ended.
 *
 * Fails **closed** — any failure (network error, non-2xx response, malformed body,
 * Trip service down) returns `{ isMember: false, status: null }` and never throws.
 * A check that can't be completed must be treated as "no access," so an outage can
 * never accidentally grant it.
 *
 * @param tripId - The trip to check.
 * @param userId - The rider whose access is in question. Sent to the Trip service
 *                 as the trusted `x-user-id` header.
 * @returns `{ isMember, status }` — `isMember` is `true` only if Trip confirms
 *          membership; `status` is the trip's status (e.g. "planned" / "ended"),
 *          or `null` on any failure.
 */
export const getTripAccess = async (
  tripId: string,
  userId: string,
): Promise<{ isMember: boolean; status: string | null }> => {
  if (!tripId || typeof userId !== "string") {
    return {
      isMember: false,
      status: null,
    }; // bad input → fail closed, same as any other failure
  }

  try {
    const res = await fetch(`${process.env.TRIP_SERVICE_URL}/${tripId}`, {
      headers: { "x-user-id": userId },
    });

    if (!res.ok) return { isMember: false, status: null }; // 404 trip-not-found, 401, 5xx, etc.

    // res.json() is typed `unknown` — narrow it to the shape we depend on.
    const body = (await res.json()) as {
      data?: {
        trip?: {
          status?: string;
        };
        members?: {
          user_id: string;
        }[];
      };
    };
    const isMember = (body.data?.members ?? []).some(
      (m) => m.user_id === userId,
    ); // missing/malformed → empty → false

    const status = body.data?.trip?.status ?? null;

    return {
      isMember,
      status,
    };
  } catch {
    return {
      isMember: false,
      status: null,
    }; // network error, JSON parse error, undefined body — all fail closed
  }
};
