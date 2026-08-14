import { randomUUID } from "crypto";
import type { InviteState } from "../../shared/types/index.js";
import { INVITE_TIMEOUT_MS } from "../../shared/constants/index.js";

export interface ResolvedInvite {
  invite: InviteState;
  accepted: boolean;
}

export class InviteManager {
  private invites: Map<string, InviteState & { timer: ReturnType<typeof setTimeout> }> = new Map();

  create(
    fromId: string,
    fromName: string,
    toId: string,
    onExpire: (inviteId: string) => void
  ): InviteState {
    // One invite per pair at a time — cancel any existing one
    this.cancelByPair(fromId, toId);

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TIMEOUT_MS).toISOString();

    const timer = setTimeout(() => {
      this.invites.delete(id);
      onExpire(id);
    }, INVITE_TIMEOUT_MS);

    const invite: InviteState = { id, fromId, fromName, toId, expiresAt };
    this.invites.set(id, { ...invite, timer });
    return invite;
  }

  resolve(inviteId: string, accepted: boolean): ResolvedInvite | null {
    const entry = this.invites.get(inviteId);
    if (!entry) return null;
    clearTimeout(entry.timer);
    this.invites.delete(inviteId);
    const { timer: _timer, ...invite } = entry;
    return { invite, accepted };
  }

  getByPair(fromId: string, toId: string): InviteState | undefined {
    for (const entry of this.invites.values()) {
      if (entry.fromId === fromId && entry.toId === toId) {
        const { timer: _t, ...inv } = entry;
        return inv;
      }
    }
    return undefined;
  }

  getById(inviteId: string): InviteState | undefined {
    const entry = this.invites.get(inviteId);
    if (!entry) return undefined;
    const { timer: _t, ...inv } = entry;
    return inv;
  }

  private cancelByPair(fromId: string, toId: string): void {
    for (const [id, entry] of this.invites) {
      if (
        (entry.fromId === fromId && entry.toId === toId) ||
        (entry.fromId === toId && entry.toId === fromId)
      ) {
        clearTimeout(entry.timer);
        this.invites.delete(id);
      }
    }
  }

  cancelAll(playerId: string): string[] {
    const cancelled: string[] = [];
    for (const [id, entry] of this.invites) {
      if (entry.fromId === playerId || entry.toId === playerId) {
        clearTimeout(entry.timer);
        this.invites.delete(id);
        cancelled.push(id);
      }
    }
    return cancelled;
  }
}
