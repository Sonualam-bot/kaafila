import express from "express";
import "dotenv/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyToken } from "./middleware/verifyToken.js";
import jwt from "jsonwebtoken";
import { Socket } from "node:net";

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

const locationProxy = createProxyMiddleware({
  target: process.env.LOCATION_SERVICE_URL,
  changeOrigin: true,
  ws: true,
});

app.use((req, _res, next) => {
  delete req.headers["x-user-id"];
  next();
});
app.use("/api/auth/me", verifyToken);
app.use("/api/auth", authProxy);
app.use("/api/trips", verifyToken, tripProxy);

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port http://localhost:${PORT} `);
});

server.on("upgrade", (req, socket, head) => {
  /**
   *1. req.url is a relative string ("/api/location?token=abc"), so give URL a
   * dummy base to parse against. We only want pathname + the token param.
   *   */
  const { pathname, searchParams } = new URL(req.url ?? "", "http://localhost");
  const token = searchParams.get("token");

  /**
   *2.  Not our route? Refuse silently - nothing to negotiate
   */
  if (!pathname.startsWith("/api/location")) {
    socket.destroy();
    return;
  }

  try {
    /**
     * 3.  No token is just as invalid as a bad token - fold both into  one path.
     */
    if (!token) throw new Error("missing token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };

    /**
     *4.  Strip any client-supplied identity, then stamp the trusted one
     */
    delete req.headers["x-user-id"];
    req.headers["x-user-id"] = decoded.userId;

    /**
     * 5.Hand the upgraded socket to the lcoation proxy
     *
     */
    locationProxy.upgrade(req, socket as Socket, head);
  } catch (error) {
    /**
     * Raw response - no Express res here, just the TCP socket.
     */
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});
