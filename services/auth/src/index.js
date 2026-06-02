import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/auth.middleware.js";

const app = express();
app.use(express.json());
const port = process.env.AUTH_PORT || 3001;

async function checkDbConnection() {
  try {
    await query("SELECT 1");
    console.log("DB Connection ok");
  } catch (error) {
    console.error("DB Connection FAILED: ", error.message);
    process.exit(1);
  }
}

/**
 * Liveness probe.
 * @route GET /health
 * @returns {200} { status: "ok" }
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

/**
 * Register a new user: validate, hash the password, persist, and issue a JWT.
 * @route POST /signup
 * @param {string} req.body.email    - User email (normalized to lowercase).
 * @param {string} req.body.password - Plaintext password (8–72 chars).
 * @returns {201} { token, user } on success.
 * @throws {ApiError} 400 - Missing/invalid fields.
 * @throws {ApiError} 409 - Email already registered.
 */
app.post(
  "/signup",
  asyncHandler(async (req, res) => {
    /** 1. Pull credentials from the parsed JSON body */
    const { email, password } = req.body;

    /**
     * 2. Validate input — presence FIRST, before touching .trim()/.length
     * on possibly-undefined values (else those throw a 500 instead of a clean 400).
     */
    if (!email || !password) {
      throw new ApiError(400, "email and password are required");
    }
    if (password.length < 8) {
      throw new ApiError(400, "password must be at least 8 characters");
    }
    if (password.length > 72) {
      throw new ApiError(400, "password too long (max 72)");
    }

    /** Normalize email so casing/whitespace can't create duplicate accounts */
    const normalizedEmail = email.trim().toLowerCase();

    /** 3. Hash the password (never store plaintext); 12 = salt rounds */
    const hash = await bcrypt.hash(password, 12);

    /**
     * 4. Insert the user. Parameterized ($1, $2) to prevent SQL injection.
     * RETURNING hands back the new row (no password_hash).
     */
    let user;
    try {
      const result = await query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        [normalizedEmail, hash],
      );
      user = result.rows[0];
    } catch (err) {
      /** 23505 = Postgres unique-violation (email already exists) */
      if (err.code === "23505") {
        throw new ApiError(409, "email already registered");
      }
      throw err; // unknown DB error: let asyncHandler forward it
    }

    /** 5. Sign a short-lived JWT carrying the user's id */
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    /** 6. Respond with the consistent ApiResponse shape */
    res.status(201).json(new ApiResponse(201, { token, user }, "User created"));
  }),
);

/**
 * Authenticate an existing user and issue a JWT.
 * @route POST /login
 * @param {string} req.body.email    - User email (normalized to match storage).
 * @param {string} req.body.password - Plaintext password to verify.
 * @returns {200} { token, user } on success.
 * @throws {ApiError} 400 - Missing/invalid fields.
 * @throws {ApiError} 401 - Invalid credentials (generic, to prevent user enumeration).
 */
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    /** 1. Pull credentials from the parsed JSON body */
    const { email, password } = req.body;

    /**
     * 2. Validate input — presence FIRST, before touching .trim()/.length
     * on possibly-undefined values (else those throw a 500 instead of a clean 400).
     */
    if (!email || !password) {
      throw new ApiError(400, "email and password are required");
    }
    if (password.length < 8) {
      throw new ApiError(400, "password must be at least 8 characters");
    }
    if (password.length > 72) {
      throw new ApiError(400, "password too long (max 72)");
    }

    /** 3. Normalize email so casing/whitespace can't create duplicate accounts */
    const normalizedEmail = email.trim().toLowerCase();

    /**
     * 4. Look up the user by email. We include password_hash here (unlike
     * signup's RETURNING) because we need it to verify the password.
     */
    const result = await query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [normalizedEmail],
    );
    const user = result.rows[0]; // undefined if no row matched

    /**
     * 5. Decide. Use ONE generic message for both "no such user" and
     * "wrong password" so an attacker can't tell which emails exist
     * (prevents user enumeration).
     */
    if (!user) {
      throw new ApiError(401, "invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new ApiError(401, "invalid credentials");
    }

    /** 6. Success — sign a JWT (same shape as signup) */
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    /** Never send password_hash back to the client */
    const safeUser = { id: user.id, email: user.email };
    res
      .status(200)
      .json(
        new ApiResponse(200, { token, user: safeUser }, "Login successful"),
      );
  }),
);

/**
 * Return the currently authenticated user's profile.
 * @route GET /me
 * @middleware authenticate - Verifies the JWT and sets req.userId.
 * @returns {200} { user } on success.
 * @throws {ApiError} 401 - Missing/invalid token (from authenticate).
 * @throws {ApiError} 404 - Authenticated user no longer exists.
 */
app.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    /** 1. req.userId was set + verified by the authenticate middleware */
    const result = await query(
      "SELECT id, email, created_at FROM users WHERE id=$1",
      [req.userId],
    );

    /** 2. Row is undefined if the user was deleted after the token was issued */
    const user = result.rows[0];

    if (!user) {
      throw new ApiError(404, "user not found");
    }

    /** 3. Respond with the consistent ApiResponse shape */
    res.status(200).json(
      new ApiResponse(
        200,
        {
          user,
        },
        "User fetched successfully",
      ),
    );
  }),
);

// Error-handling middleware
app.use(errorHandler);

await checkDbConnection();
app.listen(port, () => {
  console.log(`Server is listening to port http://localhost:${port}`);
});
