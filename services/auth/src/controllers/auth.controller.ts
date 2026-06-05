import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  signup as signupUser,
  login as loginUser,
  getProfile,
  refreshAccessToken,
  logout as logoutUser,
} from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";

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

/**
 * Exchange a valid refresh token for a fresh access token.
 * @route POST /refresh
 * @param {string} req.body.refreshToken - The refresh token issued at login/signup.
 * @returns {200} { accessToken }
 * @throws {ApiError} 400 - refreshToken missing from the request body.
 * @throws {ApiError} 401 - refreshToken invalid, expired, or revoked (from the service).
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "refresh token not found");
  }

  const result = await refreshAccessToken(refreshToken);
  res.status(200).json(new ApiResponse(200, result, "Token refreshed"));
});

/**
 * Log out by revoking the supplied refresh token.
 * @route POST /logout
 * @param {string} req.body.refreshToken - The refresh token to revoke.
 * @returns {200} { data: null } - Logged out.
 * @throws {ApiError} 400 - refreshToken missing from the request body.
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "refresh token not found");
  }

  await logoutUser(refreshToken);

  res.status(200).json(new ApiResponse(200, null, "Logged out"));
});
