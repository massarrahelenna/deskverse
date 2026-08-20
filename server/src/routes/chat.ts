import { desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { chatMessages } from "../db/schema.js";

export async function persistChatMessage(
  senderId: string,
  playerName: string,
  content: string,
): Promise<void> {
  await db.insert(chatMessages).values({ senderId, playerName, content }).execute();
}

export async function getRecentChat(limit = 50): Promise<{
  id: string;
  senderId: string;
  playerName: string;
  content: string;
  createdAt: Date;
}[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}
