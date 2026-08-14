import { pgTable, uuid, varchar, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  oauthProvider:      varchar("oauth_provider", { length: 20 }).notNull(), // 'google' | 'github'
  oauthId:            varchar("oauth_id", { length: 100 }).notNull(),
  email:              varchar("email", { length: 255 }),
  displayName:        varchar("display_name", { length: 100 }).notNull(),
  avatarUrl:          varchar("avatar_url", { length: 500 }),
  googleAccessToken:  text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpires: bigint("google_token_expires", { mode: "number" }),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id:         uuid("id").primaryKey().defaultRandom(),
  senderId:   uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content:    text("content").notNull(),
  readAt:     timestamp("read_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User    = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
