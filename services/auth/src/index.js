import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {query} from "./db.js"
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(express.json())
const port = process.env.AUTH_PORT || 3001;

async function checkDbConnection(){
    try {
        await query("SELECT 1");
        console.log("DB Connection ok")
    } catch (error) {
        console.error("DB Connection FAILED: ", error.message)
        process.exit(1)
        
    }
}

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
})



app.post("/signup", asyncHandler(async (req, res) => {
    // 1. Pull credentials from the parsed JSON body
    const { email, password } = req.body;

    // 2. Validate input — presence FIRST, before touching .trim()/.length
    //    on possibly-undefined values (else those throw a 500 instead of a clean 400).
    if (!email || !password) {
        throw new ApiError(400, "email and password are required");
    }
    if (password.length < 8) {
        throw new ApiError(400, "password must be at least 8 characters");
    }
    if (password.length > 72) {
        throw new ApiError(400, "password too long (max 72)");
    }

    // Normalize email so casing/whitespace can't create duplicate accounts
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Hash the password (never store plaintext); 12 = salt rounds
    const hash = await bcrypt.hash(password, 12);

    // 4. Insert the user. Parameterized ($1, $2) to prevent SQL injection.
    //    RETURNING hands back the new row (no password_hash).
    let user;
    try {
        const result = await query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
            [normalizedEmail, hash]
        );
        user = result.rows[0];
    } catch (err) {
        // 23505 = Postgres unique-violation (email already exists)
        if (err.code === "23505") {
            throw new ApiError(409, "email already registered");
        }
        throw err; // unknown DB error: let asyncHandler forward it
    }

    // 5. Sign a short-lived JWT carrying the user's id
    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
    );

    // 6. Respond with the consistent ApiResponse shape
    res.status(201).json(new ApiResponse(201, { token, user }, "User created"));
}));




// Error-handling middleware — MUST be last, after all routes
app.use(errorHandler);

await checkDbConnection();
app.listen(port, () => {
    console.log(`Server is listening to port http://localhost:${port}`)
})