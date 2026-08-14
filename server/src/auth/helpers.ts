import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import type { User } from "../db/schema.js";

export async function upsertUser(
  provider: "google" | "github",
  oauthId: string,
  email: string | null,
  displayName: string,
  avatarUrl: string | null,
  googleAccessToken?: string | null,
  googleRefreshToken?: string | null,
  googleTokenExpires?: number | null,
): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId)),
  });

  if (existing) {
    // Update Google tokens when present (re-auth or first time with calendar scope)
    if (googleAccessToken) {
      const [updated] = await db
        .update(users)
        .set({
          googleAccessToken,
          googleRefreshToken: googleRefreshToken ?? existing.googleRefreshToken,
          googleTokenExpires: googleTokenExpires ?? existing.googleTokenExpires,
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      oauthProvider: provider, oauthId, email, displayName, avatarUrl,
      googleAccessToken,
      googleRefreshToken,
      googleTokenExpires,
    })
    .returning();

  return created;
}

export async function findUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
