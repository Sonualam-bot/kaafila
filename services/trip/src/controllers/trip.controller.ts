import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTrip as createTripService,
  getMyTrips as getMyTripsService,
  getTrip as getTripService,
  joinTrip as joinTripService,
  endTrip as endTripService,
  startTrip as startTripService,
  pauseTrip as pauseTripService,
  resumeTrip as resumeTripService,
} from "../services/trip.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * POST / — create a trip. Reads `title` from the body and the creator's id
 * from req.userId (set by requireUser). Responds 201 with the new trip.
 */
export const createTrip = asyncHandler(async (req: Request, res: Response) => {
  const { title } = req.body;
  const trip = await createTripService({ hostId: req.userId!, title });

  res.status(201).json(new ApiResponse(201, trip, "Trip created"));
});

/** GET / — list the trips the authenticated user belongs to. Responds 200. */
export const getMyTrips = asyncHandler(async (req: Request, res: Response) => {
  const trips = await getMyTripsService(req.userId!);
  res.status(200).json(new ApiResponse(200, trips, "Trip fetched"));
});

/**
 * GET /:id — fetch a single trip plus its member list. The trip id comes from
 * the route param. Responds 200; the service throws 404 if it doesn't exist.
 */
export const getTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;

  const result = await getTripService({ tripId });
  res.status(200).json(new ApiResponse(200, result, "Trip fetched"));
});

/**
 * POST /:id/join — add the authenticated user (req.userId) to the trip as a
 * "rider". Responds 200 with the updated member list; the service throws 404
 * if the trip is missing and 409 if the user has already joined.
 */
export const joinTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;
  const members = await joinTripService({
    tripId: tripId,
    userId: req.userId!,
  });
  res.status(200).json(new ApiResponse(200, members, "Joined trip"));
});

/**
 * POST /:id/end — end a trip. The trip id comes from the route param and the
 * requester's id from req.userId. Responds 200 with the updated trip; the
 * service throws 404 if it's missing and 403 if the requester isn't the host.
 */
export const endTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;
  const trip = await endTripService({ tripId, userId: req.userId! });

  res.status(200).json(new ApiResponse(200, trip, "Trip ended"));
});

/**
 * POST /:id/start - start a trip. The trip id comes from the route param and the requester's id from req.userId. Responds 200 with the updated trip; the service throws 404 if its missing and 403 if the requester isn't the host
 */

export const startTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;
  const trip = await startTripService({ tripId, userId: req.userId! });

  res.status(200).json(new ApiResponse(200, trip, "Trip started"));
});

/**
 * POST /:id/pause — pause an in-progress trip. id from the route param,
 * requester from req.userId. Responds 200 with the updated trip; the service
 * throws 404 if missing, 403 if not the host, 409 if it isn't "started".
 */
export const pauseTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;
  const trip = await pauseTripService({ tripId, userId: req.userId! });

  res.status(200).json(new ApiResponse(200, trip, "Trip paused"));
});

/**
 * POST /:id/resume — resume a paused trip. id from the route param, requester
 * from req.userId. Responds 200 with the updated trip; the service throws 404
 * if missing, 403 if not the host, 409 if it isn't "paused".
 */
export const resumeTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.id as string;
  const trip = await resumeTripService({ tripId, userId: req.userId! });

  res.status(200).json(new ApiResponse(200, trip, "Trip resumed"));
});
