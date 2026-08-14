import type { WebSocket } from "@fastify/websocket";
import type { PlayerState, ZoneState, RecadoMessage } from "../../shared/types/index.js";
import type { ServerEvent } from "../../shared/events/index.js";
import { ABSENCE_TIMEOUT_MS, WORLD_W, WORLD_H } from "../../shared/constants/index.js";
import { InviteManager } from "./InviteManager.js";
import { ConversationManager } from "./ConversationManager.js";
import { JitsiCallProvider } from "./CallProvider.js";
import { randomUUID } from "crypto";

interface ConnectedPlayer {
  socket: WebSocket;
  state: PlayerState;
  absenceTimer: ReturnType<typeof setTimeout> | null;
  pendingZoneId?: string; // zone enter awaiting ZONE_JOIN_CONFIRM
}

interface ZoneConfig {
  zoneId: string;
  name: string;
  type: string;
  autoJoin: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  occupants: Set<string>;
}

const STATIC_ZONES: ZoneConfig[] = [
  {
    zoneId: "sala-ipe",
    name: "Sala de Reunião",
    type: "meeting-room",
    autoJoin: true,
    x: 608, y: 32, width: 320, height: 224,
    occupants: new Set(),
  },
  {
    zoneId: "foco",
    name: "Foco",
    type: "focus",
    autoJoin: false,
    x: 32, y: 480, width: 224, height: 128,
    occupants: new Set(),
  },
  {
    zoneId: "musica",
    name: "Área de Descanso",
    type: "descanso",
    autoJoin: false,
    x: 768, y: 416, width: 160, height: 192,
    occupants: new Set(),
  },
];

export class RoomManager {
  private players: Map<string, ConnectedPlayer> = new Map();
  private zones: Map<string, ZoneConfig> = new Map();
  private recados: Map<string, RecadoMessage[]> = new Map();
  private inviteManager = new InviteManager();
  private convManager = new ConversationManager(new JitsiCallProvider());

  constructor() {
    for (const z of STATIC_ZONES) {
      this.zones.set(z.zoneId, z);
    }
  }

  // ─── Player lifecycle ──────────────────────────────────────────────────────

  addPlayer(socket: WebSocket, state: PlayerState): void {
    const existing = this.players.get(state.id);
    if (existing) {
      // Reconnect: reuse existing state, update socket
      existing.socket = socket;
      existing.state.status = "livre";
      this.resetAbsenceTimer(state.id);
      this.sendTo(socket, {
        type: "PLAYERS_SNAPSHOT",
        players: this.allStates().filter((p) => p.id !== state.id),
        zones: this.allZoneStates(),
      });
      this.broadcast({ type: "PLAYER_JOIN", player: existing.state }, state.id);
      return;
    }

    const player: ConnectedPlayer = {
      socket,
      state: { ...state, status: "livre" },
      absenceTimer: null,
    };
    this.players.set(state.id, player);
    this.resetAbsenceTimer(state.id);

    this.sendTo(socket, {
      type: "PLAYERS_SNAPSHOT",
      players: this.allStates().filter((p) => p.id !== state.id),
      zones: this.allZoneStates(),
    });
    this.broadcast({ type: "PLAYER_JOIN", player: player.state }, state.id);
    console.log(`[room] ${state.name} joined. Total: ${this.players.size}`);
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    clearTimeout(player.absenceTimer ?? undefined);

    // Clean up zone occupancy
    for (const zone of this.zones.values()) {
      if (zone.occupants.has(playerId)) {
        zone.occupants.delete(playerId);
        this.broadcastZoneState(zone.zoneId);
      }
    }

    // Leave conversation if in one
    this.leaveConversation(playerId, true);

    // Cancel pending invites
    const cancelledIds = this.inviteManager.cancelAll(playerId);
    for (const id of cancelledIds) {
      this.broadcast({ type: "INVITE_EXPIRED", inviteId: id });
    }

    this.players.delete(playerId);
    this.broadcast({ type: "PLAYER_LEAVE", playerId });
    console.log(`[room] ${playerId} left. Total: ${this.players.size}`);
  }

  // ─── Movement & Absence ───────────────────────────────────────────────────

  updatePosition(
    playerId: string,
    x: number,
    y: number,
    direction: PlayerState["direction"],
    animation: string
  ): void {
    const player = this.players.get(playerId);
    if (!player) return;

    if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) {
      console.warn(`[room] invalid position from ${playerId}: (${x}, ${y})`);
      return;
    }

    player.state.x = x;
    player.state.y = y;
    player.state.direction = direction;
    player.state.animation = animation;

    if (player.state.status === "ausente") {
      this.setStatus(playerId, "livre");
    }
    this.resetAbsenceTimer(playerId);

    this.broadcast({ type: "PLAYER_MOVE", playerId, x, y, direction, animation }, playerId);
  }

  private resetAbsenceTimer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.absenceTimer) clearTimeout(player.absenceTimer);
    player.absenceTimer = setTimeout(() => {
      this.setStatusIfAllowed(playerId, "ausente");
    }, ABSENCE_TIMEOUT_MS);
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  setStatus(playerId: string, status: PlayerState["status"]): void {
    const player = this.players.get(playerId);
    if (!player || player.state.status === status) return;
    player.state.status = status;
    this.broadcast({ type: "PLAYER_STATUS", playerId, status });
  }

  private setStatusIfAllowed(playerId: string, status: PlayerState["status"]): void {
    const player = this.players.get(playerId);
    if (!player) return;
    // Cannot become ausente if in a meeting or resting
    if (status === "ausente" && (player.state.status === "em_reuniao" || player.state.status === "em_descanso")) return;
    this.setStatus(playerId, status);
  }

  toggleFocus(playerId: string, enable: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (enable && player.state.status === "livre") {
      this.setStatus(playerId, "em_foco");
    } else if (!enable && player.state.status === "em_foco") {
      this.setStatus(playerId, "livre");
      this.deliverPendingRecados(playerId);
    }
  }

  // ─── Zones ────────────────────────────────────────────────────────────────

  playerEnterZone(playerId: string, zoneId: string): void {
    const player = this.players.get(playerId);
    const zone = this.zones.get(zoneId);
    if (!player || !zone) return;

    if (zone.type === "focus") {
      zone.occupants.add(playerId);
      this.setStatus(playerId, "em_foco");
      this.broadcastZoneState(zoneId);
      return;
    }

    if (zone.type === "descanso") {
      zone.occupants.add(playerId);
      this.setStatus(playerId, "em_descanso");
      this.broadcastZoneState(zoneId);
      return;
    }

    if (zone.type === "meeting-room" && zone.autoJoin) {
      zone.occupants.add(playerId);
      player.pendingZoneId = zoneId;
      const existingConv = this.convManager.getZoneConversation(zoneId);
      const participants = Array.from(zone.occupants)
        .filter((id) => id !== playerId)
        .map((id) => this.players.get(id)?.state.name ?? id);

      this.sendTo(player.socket, {
        type: "ZONE_JOIN_PROMPT",
        zoneId,
        zoneName: zone.name,
        participants,
        meetUrl: existingConv?.meetUrl,
        countdownMs: 3000,
      });
      this.broadcastZoneState(zoneId);
    }
  }

  playerConfirmZoneJoin(playerId: string, zoneId: string): void {
    const player = this.players.get(playerId);
    const zone = this.zones.get(zoneId);
    if (!player || !zone) return;
    if (player.pendingZoneId !== zoneId) return;
    player.pendingZoneId = undefined;

    const { conversation, isNew } = this.convManager.joinZone(zoneId, playerId);
    this.setStatus(playerId, "em_reuniao");

    this.sendTo(player.socket, { type: "CONVERSATION_JOIN", conversation });

    if (!isNew) {
      // Notify other participants that someone new joined
      for (const participantId of conversation.participants) {
        if (participantId !== playerId) {
          const other = this.players.get(participantId);
          if (other) {
            this.sendTo(other.socket, { type: "CONVERSATION_UPDATE", conversation });
          }
        }
      }
    }

    console.log(`[room] ${player.state.name} joined zone ${zone.name} (conv ${conversation.id})`);
  }

  playerCancelZoneJoin(playerId: string, zoneId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.pendingZoneId === zoneId) {
      player.pendingZoneId = undefined;
    }
    // Remove from occupants if they chose to cancel
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.occupants.delete(playerId);
      this.broadcastZoneState(zoneId);
    }
  }

  playerLeaveZone(playerId: string, zoneId: string): void {
    const player = this.players.get(playerId);
    const zone = this.zones.get(zoneId);
    if (!player || !zone) return;

    zone.occupants.delete(playerId);
    player.pendingZoneId = undefined;

    if (zone.type === "focus" && player.state.status === "em_foco") {
      this.setStatus(playerId, "livre");
      this.deliverPendingRecados(playerId);
    }

    if (zone.type === "descanso" && player.state.status === "em_descanso") {
      this.setStatus(playerId, "livre");
    }

    if (zone.type === "meeting-room") {
      this.leaveConversation(playerId, false);
    }

    this.broadcastZoneState(zoneId);
  }

  // ─── Invites ──────────────────────────────────────────────────────────────

  sendInvite(fromId: string, toId: string): void {
    const from = this.players.get(fromId);
    const to = this.players.get(toId);
    if (!from || !to) return;

    if (from.state.status !== "livre") {
      this.sendTo(from.socket, { type: "ERROR", message: "Você não está livre para iniciar uma conversa." });
      return;
    }
    if (to.state.status === "em_foco") {
      this.sendTo(from.socket, { type: "ERROR", message: `${to.state.name} está em foco. Use 'Deixar recado'.` });
      return;
    }
    if (to.state.status === "ausente") {
      this.sendTo(from.socket, { type: "ERROR", message: `${to.state.name} está ausente.` });
      return;
    }

    const invite = this.inviteManager.create(fromId, from.state.name, toId, (inviteId) => {
      this.sendTo(from.socket, { type: "INVITE_EXPIRED", inviteId });
      this.sendTo(to.socket, { type: "INVITE_EXPIRED", inviteId });
    });

    this.sendTo(to.socket, { type: "INVITE_INCOMING", invite });
    console.log(`[invite] ${from.state.name} → ${to.state.name}`);
  }

  respondToInvite(inviteId: string, _responderId: string, accept: boolean): void {
    const result = this.inviteManager.resolve(inviteId, accept);
    if (!result) return;

    const { invite } = result;
    const from = this.players.get(invite.fromId);
    const to = this.players.get(invite.toId);

    if (!accept) {
      if (from) this.sendTo(from.socket, { type: "INVITE_RESULT", inviteId, accepted: false });
      if (to) this.sendTo(to.socket, { type: "INVITE_RESULT", inviteId, accepted: false });
      return;
    }

    // Create conversation
    const conversation = this.convManager.createForPair([invite.fromId, invite.toId]);
    this.setStatus(invite.fromId, "em_reuniao");
    this.setStatus(invite.toId, "em_reuniao");

    if (from) this.sendTo(from.socket, { type: "INVITE_RESULT", inviteId, accepted: true, conversation });
    if (to) this.sendTo(to.socket, { type: "INVITE_RESULT", inviteId, accepted: true, conversation });

    // Also send CONVERSATION_JOIN so both open the HUD
    if (from) this.sendTo(from.socket, { type: "CONVERSATION_JOIN", conversation });
    if (to) this.sendTo(to.socket, { type: "CONVERSATION_JOIN", conversation });

    console.log(`[invite] accepted → conv ${conversation.id} (${conversation.meetUrl})`);
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  leaveConversation(playerId: string, silent: boolean): void {
    const updatedConv = this.convManager.removeParticipant(playerId);
    const player = this.players.get(playerId);

    if (player && player.state.status === "em_reuniao") {
      this.setStatus(playerId, "livre");
    }

    if (!silent && player) {
      this.sendTo(player.socket, { type: "CONVERSATION_END", conversationId: "current" });
    }

    if (updatedConv) {
      // Notify remaining participants
      for (const pid of updatedConv.participants) {
        const p = this.players.get(pid);
        if (p) this.sendTo(p.socket, { type: "CONVERSATION_UPDATE", conversation: updatedConv });
      }
    } else {
      // Last one out — conversation ended
      this.broadcast({ type: "CONVERSATION_END", conversationId: "ended" });
    }
  }

  // ─── Recados ─────────────────────────────────────────────────────────────

  sendRecado(fromId: string, toId: string, content: string): void {
    const from = this.players.get(fromId);
    const to = this.players.get(toId);
    if (!from || !to) return;

    if (to.state.status !== "em_foco") {
      this.sendTo(from.socket, { type: "ERROR", message: `${to.state.name} não está em foco.` });
      return;
    }

    const msg: RecadoMessage = {
      id: randomUUID(),
      fromId,
      fromName: from.state.name,
      content: content.slice(0, 500),
      sentAt: new Date().toISOString(),
    };

    const queue = this.recados.get(toId) ?? [];
    queue.push(msg);
    this.recados.set(toId, queue);
    console.log(`[recado] ${from.state.name} → ${to.state.name}`);
  }

  private deliverPendingRecados(playerId: string): void {
    const msgs = this.recados.get(playerId);
    if (!msgs?.length) return;
    const player = this.players.get(playerId);
    if (!player) return;
    this.sendTo(player.socket, { type: "RECADOS_PENDING", messages: msgs });
    this.recados.delete(playerId);
  }

  markRecadosSeen(playerId: string): void {
    this.recados.delete(playerId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private allStates(): PlayerState[] {
    return Array.from(this.players.values()).map((p) => p.state);
  }

  private allZoneStates(): ZoneState[] {
    return Array.from(this.zones.values()).map((z) => this.buildZoneState(z));
  }

  private buildZoneState(zone: ZoneConfig): ZoneState {
    const conv = this.convManager.getZoneConversation(zone.zoneId);
    return {
      zoneId: zone.zoneId,
      zoneName: zone.name,
      autoJoin: zone.autoJoin,
      occupants: Array.from(zone.occupants),
      conversationId: conv?.id,
      meetUrl: conv?.meetUrl,
    };
  }

  private broadcastZoneState(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    this.broadcast({ type: "ZONE_STATE", zone: this.buildZoneState(zone) });
  }

  broadcast(event: ServerEvent, excludeId?: string): void {
    const payload = JSON.stringify(event);
    for (const [id, player] of this.players) {
      if (id === excludeId) continue;
      if (player.socket.readyState === 1) player.socket.send(payload);
    }
  }

  sendTo(socket: WebSocket, event: ServerEvent): void {
    if (socket.readyState === 1) socket.send(JSON.stringify(event));
  }

  broadcastToZone(zoneId: string, event: ServerEvent): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    const payload = JSON.stringify(event);
    for (const occupantId of zone.occupants) {
      const p = this.players.get(occupantId);
      if (p?.socket.readyState === 1) p.socket.send(payload);
    }
  }

  get playerCount(): number {
    return this.players.size;
  }
}
