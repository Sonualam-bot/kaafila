import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  signup as signupUser,
  login as loginUser,
  getProfile,
} from "../services/auth.service.js";

/**
 * Register a new user.
 * @route POST /signup
 * @param {string} req.body.email    - User email.
 * @param {string} req.body.password - Plaintext password.
 * @returns {201} { token, user }
 */
export const signup = asyncHandler(async (req, res) => {
  /** 1. Pull inputs out of the HTTP layer */
  const { email, password } = req.body;

  /** 2. Hand off to the service (all business logic lives there) */
  const result = await signupUser(email, password);

  /** 3. Translate the service result into an HTTP response */
  res.status(201).json(new ApiResponse(201, result, "User created"));
});

/**
 * Authenticate an existing user and issue a JWT.
 * @route POST /login
 * @param {string} req.body.email    - User email.
 * @param {string} req.body.password - Plaintext password.
 * @returns {200} { token, user }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  res.status(200).json(new ApiResponse(200, result, "Login successful"));
});

/**
 * Return the currently authenticated user's profile.
 * @route GET /me
 * @middleware authenticate - Verifies the JWT and sets req.userId.
 * @returns {200} { user }
 */
export const getMe = asyncHandler(async (req, res) => {
  /** req.userId is guaranteed here — the authenticate middleware ran first */
  const user = await getProfile(req.userId!);
  res
    .status(200)
    .json(new ApiResponse(200, { user }, "User fetched successfully"));
});
