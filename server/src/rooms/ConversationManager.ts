import { randomUUID } from "crypto";
import type { Conversation } from "../../shared/types/index.js";
import type { CallProvider } from "./CallProvider.js";

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private zoneConversations: Map<string, string> = new Map();

  constructor(private callProvider: CallProvider) {}

  createForPair(participantIds: string[]): Conversation {
    const id = randomUUID();
    const conv: Conversation = {
      id,
      meetUrl: this.callProvider.createMeetUrl(id),
      participants: [...participantIds],
      startedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conv);
    return conv;
  }

  joinZone(zoneId: string, playerId: string): { conversation: Conversation; isNew: boolean } {
    const existingId = this.zoneConversations.get(zoneId);
    if (existingId) {
      const conv = this.conversations.get(existingId);
      if (conv && !conv.participants.includes(playerId)) {
        conv.participants.push(playerId);
      }
      return { conversation: conv!, isNew: false };
    }

    const id = randomUUID();
    const conv: Conversation = {
      id,
      meetUrl: this.callProvider.createMeetUrl(id),
      participants: [playerId],
      zoneId,
      startedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conv);
    this.zoneConversations.set(zoneId, id);
    return { conversation: conv, isNew: true };
  }

  getZoneConversation(zoneId: string): Conversation | undefined {
    const id = this.zoneConversations.get(zoneId);
    return id ? this.conversations.get(id) : undefined;
  }

  getByPlayer(playerId: string): Conversation | undefined {
    for (const conv of this.conversations.values()) {
      if (conv.participants.includes(playerId)) return conv;
    }
    return undefined;
  }

  getById(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  removeParticipant(playerId: string): Conversation | null {
    const conv = this.getByPlayer(playerId);
    if (!conv) return null;

    conv.participants = conv.participants.filter((id) => id !== playerId);

    if (conv.participants.length === 0) {
      this.conversations.delete(conv.id);
      if (conv.zoneId) this.zoneConversations.delete(conv.zoneId);
      return null;
    }

    return conv;
  }

  snapshot(): Conversation[] {
    return Array.from(this.conversations.values());
  }
}
