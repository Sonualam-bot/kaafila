import express from "express";
import "dotenv/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyToken } from "./middleware/verifyToken.js";

const PORT = Number(process.env.GATEWAY_PORT) || 3000;

const app = express();

const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
});

const tripProxy = createProxyMiddleware({
  target: process.env.TRIP_SERVICE_URL,
  changeOrigin: true,
});

app.use((req, _res, next) => {
  delete req.headers["x-user-id"];
  next();
});
app.use("/api/auth/me", verifyToken);
app.use("/api/auth", authProxy);
app.use("/api/trips", verifyToken, tripProxy);

app.listen(PORT, () => {
  console.log(`Server is listening on port http://localhost:${PORT} `);
});
