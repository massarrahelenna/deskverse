import { config } from "dotenv";
config({ path: "../.env" });

import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { RoomManager } from "./rooms/RoomManager.js";
import { createWsHandler } from "./multiplayer/wsHandler.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { registerCalendarRoutes } from "./routes/calendar.js";
import { runMigrations } from "./db/migrate.js";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = parseInt(process.env.PORT ?? "4000");

const app = Fastify({ logger: { level: "info" } });

await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true,
});

await app.register(fastifyCookie);

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET ?? "deskverse-dev-secret-change-in-production",
  cookie: { cookieName: "dv_token", signed: false },
});

await app.register(fastifyWebsocket);

await runMigrations();

const roomManager = new RoomManager();
const wsHandler = createWsHandler(app, roomManager);

app.get("/ws", { websocket: true }, wsHandler);

await registerAuthRoutes(app);
await registerMessageRoutes(app);
await registerCalendarRoutes(app);

app.get("/health", async () => ({
  status: "ok",
  rooms: 1,
  players: roomManager.playerCount,
  uptime: Math.round(process.uptime()),
}));

try {
  await app.listen({ host: HOST, port: PORT });
  console.log(`DeskVerse server running on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
