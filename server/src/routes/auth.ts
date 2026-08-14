import type { FastifyInstance } from "fastify";
import { upsertUser, findUserById } from "../auth/helpers.js";

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_INFO_URL  = "https://www.googleapis.com/oauth2/v2/userinfo";

const GITHUB_AUTH_URL  = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_INFO_URL  = "https://api.github.com/user";

function serverUrl()  { return process.env.SERVER_URL  ?? "http://localhost:4000"; }
function clientUrl()  { return process.env.CLIENT_URL  ?? "http://localhost:3000"; }
function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 7,
    path:     "/",
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // ── Google ────────────────────────────────────────────────────────────────

  app.get("/auth/google", async (_req, reply) => {
    const params = new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      redirect_uri:  `${serverUrl()}/auth/google/callback`,
      response_type: "code",
      scope:         "openid email profile https://www.googleapis.com/auth/calendar.events",
      access_type:   "offline",
      prompt:        "consent",
    });
    reply.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const { code } = req.query as { code?: string };
    if (!code) return reply.redirect(`${clientUrl()}/?auth=error`);

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  `${serverUrl()}/auth/google/callback`,
      }),
    });
    const tokens = await tokenRes.json() as {
      access_token?: string; refresh_token?: string; expires_in?: number;
    };
    if (!tokens.access_token) return reply.redirect(`${clientUrl()}/?auth=error`);

    const info = await fetch(GOOGLE_INFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => r.json()) as { id: string; email: string; name: string; picture: string };

    const user  = await upsertUser(
      "google", info.id, info.email, info.name, info.picture,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    );
    const token = app.jwt.sign({ userId: user.id }, { expiresIn: "7d" });

    reply.setCookie("dv_token", token, cookieOpts());
    reply.redirect(`${clientUrl()}/?auth=success`);
  });

  // ── GitHub ────────────────────────────────────────────────────────────────

  app.get("/auth/github", async (_req, reply) => {
    const params = new URLSearchParams({
      client_id:    process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${serverUrl()}/auth/github/callback`,
      scope:        "read:user user:email",
    });
    reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  app.get("/auth/github/callback", async (req, reply) => {
    const { code } = req.query as { code?: string };
    if (!code) return reply.redirect(`${clientUrl()}/?auth=error`);

    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept:         "application/json",
      },
      body: new URLSearchParams({
        client_id:     process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri:  `${serverUrl()}/auth/github/callback`,
      }),
    });
    const tokens = await tokenRes.json() as { access_token?: string };
    if (!tokens.access_token) return reply.redirect(`${clientUrl()}/?auth=error`);

    const info = await fetch(GITHUB_INFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept:        "application/vnd.github+json",
      },
    }).then((r) => r.json()) as { id: number; name: string; login: string; avatar_url: string; email?: string };

    const user  = await upsertUser("github", String(info.id), info.email ?? null, info.name ?? info.login, info.avatar_url);
    const token = app.jwt.sign({ userId: user.id }, { expiresIn: "7d" });

    reply.setCookie("dv_token", token, cookieOpts());
    reply.redirect(`${clientUrl()}/?auth=success`);
  });

  // ── Me + Logout ───────────────────────────────────────────────────────────

  app.get("/api/me", async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string }>();
      const user    = await findUserById(payload.userId);
      if (!user) return reply.status(401).send({ error: "not found" });
      return reply.send({
        id:          user.id,
        displayName: user.displayName,
        avatarUrl:   user.avatarUrl,
        email:       user.email,
      });
    } catch {
      return reply.status(401).send({ error: "unauthenticated" });
    }
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie("dv_token", { path: "/" });
    return reply.send({ ok: true });
  });
}
