import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

const GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function getValidGoogleToken(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user?.googleAccessToken) return null;

  if (user.googleTokenExpires && Date.now() > user.googleTokenExpires - 120_000) {
    if (!user.googleRefreshToken) return null;
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    "refresh_token",
        refresh_token: user.googleRefreshToken,
      }),
    });
    const data = await res.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    await db.update(users).set({
      googleAccessToken:  data.access_token,
      googleTokenExpires: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    }).where(eq(users.id, userId));
    return data.access_token;
  }

  return user.googleAccessToken;
}

export async function registerCalendarRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/calendar/events", async (req, reply) => {
    let userId: string;
    try {
      const payload = await req.jwtVerify<{ userId: string }>();
      userId = payload.userId;
    } catch {
      return reply.status(401).send({ error: "unauthenticated" });
    }

    const token = await getValidGoogleToken(userId);
    if (!token) {
      return reply.status(403).send({ error: "google_calendar_not_connected" });
    }

    const body = req.body as {
      title: string;
      startAt: string;
      endAt: string;
      description?: string;
      attendeeEmails?: string[];
      meetUrl?: string;
    };

    const event = {
      summary:     body.title.slice(0, 200),
      description: body.description ?? "",
      start:   { dateTime: body.startAt, timeZone: "America/Sao_Paulo" },
      end:     { dateTime: body.endAt,   timeZone: "America/Sao_Paulo" },
      attendees: (body.attendeeEmails ?? []).map((email) => ({ email })),
      conferenceData: body.meetUrl ? {
        entryPoints: [{ entryPointType: "video", uri: body.meetUrl, label: "DeskVerse" }],
      } : undefined,
    };

    const res = await fetch(`${GOOGLE_CALENDAR_URL}?sendUpdates=all`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[calendar] error:", err);
      return reply.status(500).send({ error: "calendar_api_error" });
    }

    const created = await res.json() as { id: string; htmlLink: string };
    return reply.send({ eventId: created.id, htmlLink: created.htmlLink });
  });

  app.get("/api/calendar/status", async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string }>();
      const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
      return reply.send({ connected: !!user?.googleAccessToken });
    } catch {
      return reply.status(401).send({ error: "unauthenticated" });
    }
  });
}
