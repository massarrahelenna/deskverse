import { describe, it, expect, vi, beforeAll } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { registerMessageRoutes } from "./messages.js";

vi.mock("../db/client.js", () => {
  const mockSelect = {
    from:     () => mockSelect,
    leftJoin: () => mockSelect,
    where:    () => mockSelect,
    orderBy:  () => mockSelect,
    limit:    () => Promise.resolve([]),
  };
  const mockInsert = {
    values:    () => mockInsert,
    returning: () => Promise.resolve([{
      id:         "msg-1",
      senderId:   "user-a",
      receiverId: "user-b",
      content:    "Olá",
      createdAt:  new Date("2025-01-01T10:00:00Z"),
      readAt:     null,
    }]),
  };
  return {
    db: {
      select: () => mockSelect,
      insert: () => mockInsert,
    },
  };
});

const JWT_SECRET = "test-secret";

async function buildApp() {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: JWT_SECRET,
    cookie: { cookieName: "dv_token", signed: false },
  });
  await registerMessageRoutes(app);
  return app;
}

function makeToken(app: Awaited<ReturnType<typeof buildApp>>, userId: string) {
  return app.jwt.sign({ userId }, { expiresIn: "1h" });
}

describe("GET /api/messages/:userId", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  it("retorna 401 sem token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/messages/user-b" });
    expect(res.statusCode).toBe(401);
  });

  it("retorna 200 com token válido", async () => {
    const token = makeToken(app, "user-a");
    const res = await app.inject({
      method: "GET",
      url: "/api/messages/user-b",
      cookies: { dv_token: token },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/messages/:userId", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  it("retorna 401 sem token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/messages/user-b",
      body: { content: "Olá" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("retorna 400 com conteúdo vazio", async () => {
    const token = makeToken(app, "user-a");
    const res = await app.inject({
      method: "POST",
      url: "/api/messages/user-b",
      cookies: { dv_token: token },
      body: { content: "   " },
    });
    expect(res.statusCode).toBe(400);
  });

  it("retorna 201 com conteúdo válido", async () => {
    const token = makeToken(app, "user-a");
    const res = await app.inject({
      method: "POST",
      url: "/api/messages/user-b",
      cookies: { dv_token: token },
      body: { content: "Olá" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { id: string };
    expect(body.id).toBe("msg-1");
  });
});
