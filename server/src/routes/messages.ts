import type { FastifyInstance } from "fastify";
import { eq, and, or, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { messages, users } from "../db/schema.js";

export async function registerMessageRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/messages/:userId", async (req, reply) => {
    let myId: string;
    try {
      const p = await req.jwtVerify<{ userId: string }>();
      myId = p.userId;
    } catch {
      return reply.status(401).send({ error: "unauthenticated" });
    }

    const { userId: otherId } = req.params as { userId: string };

    const rows = await db
      .select({
        id:         messages.id,
        senderId:   messages.senderId,
        receiverId: messages.receiverId,
        content:    messages.content,
        createdAt:  messages.createdAt,
        readAt:     messages.readAt,
        senderName: users.displayName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, myId),     eq(messages.receiverId, otherId)),
          and(eq(messages.senderId, otherId),   eq(messages.receiverId, myId)),
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(100);

    return reply.send(rows.reverse());
  });

  app.post("/api/messages/:userId", async (req, reply) => {
    let myId: string;
    try {
      const p = await req.jwtVerify<{ userId: string }>();
      myId = p.userId;
    } catch {
      return reply.status(401).send({ error: "unauthenticated" });
    }

    const { userId: otherId } = req.params as { userId: string };
    const { content } = req.body as { content?: string };
    if (!content?.trim()) return reply.status(400).send({ error: "empty" });

    const [msg] = await db
      .insert(messages)
      .values({ senderId: myId, receiverId: otherId, content: content.trim() })
      .returning();

    return reply.status(201).send(msg);
  });
}

export async function persistMessage(senderId: string, receiverId: string, content: string): Promise<void> {
  await db.insert(messages).values({ senderId, receiverId, content }).execute();
}
