import { Router } from "express";
import {
  getMe,
  login,
  refresh,
  signup,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

/**
 * Auth router — maps HTTP method + path to controllers. Declarations only,
 * no logic. Mounted onto the app in index.ts.
 */
const router = Router();

router.post("/signup", signup);
router.post("/login", login);

/**
 * Protected route: `authenticate` runs first and only hands off to `getMe`
 * if the JWT checks out (otherwise it short-circuits with a 401).
 */
router.get("/me", authenticate, getMe);

/**
 * Public route: takes a refresh token in the body and returns a new access
 * token. No `authenticate` — the refresh token IS the credential here (the
 * access token is expected to be expired by the time this is called).
 */
router.post("/refresh", refresh);

export { router };
