import { sql } from "drizzle-orm";
import { db } from "./client.js";

export async function runMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      oauth_provider VARCHAR(20)  NOT NULL,
      oauth_id       VARCHAR(100) NOT NULL,
      email          VARCHAR(255),
      display_name   VARCHAR(100) NOT NULL,
      avatar_url     VARCHAR(500),
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE(oauth_provider, oauth_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      read_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_msg_a ON messages(sender_id,   receiver_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_msg_b ON messages(receiver_id, sender_id,   created_at);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token  TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires BIGINT;
  `);
  console.log("[db] migrations applied");
}
