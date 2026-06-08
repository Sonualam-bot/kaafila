/**
 * Trip routes. Every route requires a gateway-supplied identity (requireUser).
 * Mounted under /api/trips by the gateway, which strips that prefix before
 * proxying — so paths here are relative ("/", "/:id", "/:id/join").
 */
import { Router } from "express";
import { requireUser } from "../middleware/requireUser.js";
import {
  createTrip,
  getMyTrips,
  getTrip,
  joinTrip,
} from "../controllers/trip.controller.js";

const router = Router();
router.use(requireUser);

router.post("/", createTrip);
router.get("/", getMyTrips);
router.get("/:id", getTrip);
router.post("/:id/join", joinTrip);

export { router };
