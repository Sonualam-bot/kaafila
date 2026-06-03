import bcrypt from "bcryptjs";
import {
  createUser,
  findByEmail,
  findById,
} from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken } from "../utils/token.js";

/**
 * Shared presence/length checks — runs before any DB or hashing work.
 * Presence FIRST, before touching .length on possibly-undefined values
 * (else those throw a 500 instead of a clean 400).
 * @param {string} email    - Candidate email.
 * @param {string} password - Candidate plaintext password (8–72 chars).
 * @throws {ApiError} 400 - Missing or out-of-range fields.
 */
const validateCredentials = (email: string, password: string) => {
  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }
  if (password.length < 8) {
    throw new ApiError(400, "password must be at least 8 characters");
  }
  if (password.length > 72) {
    throw new ApiError(400, "password too long (max 72)");
  }
};

/**
 * Register a new user: validate → hash → persist (via repo) → issue a JWT.
 * @param {string} email    - User email (normalized to lowercase before storage).
 * @param {string} password - Plaintext password (8–72 chars).
 * @returns { token, user } on success.
 * @throws {ApiError} 400 - Missing/invalid fields.
 * @throws {ApiError} 409 - Email already registered.
 */
export const signup = async (email: string, password: string) => {
  /** 1. Validate input before any expensive work */
  validateCredentials(email, password);

  /** 2. Normalize email so casing/whitespace can't create duplicate accounts */
  const normalizedEmail = email.trim().toLowerCase();

  /** 3. Hash the password (never store plaintext); 12 = salt rounds */
  const password_hash = await bcrypt.hash(password, 12);

  /** 4. Persist via the repository. Translate the unique-violation to a domain error. */
  let user;
  try {
    user = await createUser({ email: normalizedEmail, password_hash });
  } catch (err) {
    /** 23505 = Postgres unique-violation (email already exists) */
    if ((err as { code?: string }).code === "23505") {
      throw new ApiError(409, "email already registered");
    }
    throw err; // unknown DB error: let it propagate to the error handler
  }

  /** 5. Sign a short-lived JWT carrying the user's id */
  const token = signAccessToken(user.id);

  /** 6. Return the token + the (password_hash-free) user row */
  return { token, user };
};

/**
 * Authenticate a user. Uses ONE generic 401 for both failure modes
 * ("no such user" and "wrong password") so an attacker can't tell which
 * emails exist (prevents user enumeration).
 * @param {string} email    - User email (normalized to match storage).
 * @param {string} password - Plaintext password to verify.
 * @returns { token, user } on success (user is stripped of password_hash).
 * @throws {ApiError} 400 - Missing/invalid fields.
 * @throws {ApiError} 401 - Invalid credentials (generic).
 */
export const login = async (email: string, password: string) => {
  /** 1. Validate input */
  validateCredentials(email, password);

  /** 2. Normalize email, then look up the user (row includes password_hash) */
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findByEmail({ email: normalizedEmail });

  /** 3. Same generic message whether the user is missing or the password is wrong */
  if (!user) {
    throw new ApiError(401, "invalid credentials");
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, "invalid credentials");
  }

  /** 4. Sign a JWT (same shape as signup) */
  const token = signAccessToken(user.id);

  /** 5. Strip password_hash before returning to the caller */
  const safeUser = { id: user.id, email: user.email };
  return { token, user: safeUser };
};

/**
 * Load a user's own profile by id (used by the authenticated /me route).
 * @param {string} userId - The verified user id (set by the authenticate middleware).
 * @returns The user row.
 * @throws {ApiError} 404 - Authenticated user no longer exists.
 */
export const getProfile = async (userId: string) => {
  /** 1. Fetch by id; undefined if the user was deleted after the token was issued */
  const user = await findById({ userId });
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  return user;
};
