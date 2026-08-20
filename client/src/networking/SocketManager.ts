import type { ServerEvent, ClientEvent } from "@shared/events";
import type { Conversation, PlayerState, ZoneState } from "@shared/types";
import { RECONNECT_DELAY_MS } from "@shared/constants";

type EventHandler = (event: ServerEvent) => void;

class SocketManagerClass {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private playerName  = "";
  private avatarSkin  = "medium";
  private shirtIndex  = 0;
  private hairColor   = "#2c1a0e";
  private accessory   = "none";
  private pantsColor  = "#334155";
  private connected   = false;

  connect(
    name: string, avatarSkin: string, shirtIndex: number,
    hairColor: string, accessory: string, pantsColor: string,
  ): void {
    this.playerName = name;
    this.avatarSkin = avatarSkin;
    this.shirtIndex = shirtIndex;
    this.hairColor  = hairColor;
    this.accessory  = accessory;
    this.pantsColor = pantsColor;
    this.openConnection();
  }

  private openConnection(): void {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const params = new URLSearchParams({
      name:       this.playerName,
      avatarSkin: this.avatarSkin,
      shirtIndex: String(this.shirtIndex),
      hairColor:  this.hairColor,
      accessory:  this.accessory,
      pantsColor: this.pantsColor,
    });
    const url = `${protocol}://${location.host}/ws?${params}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      console.log("[ws] conectado");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (ev: MessageEvent<string>) => {
      try {
        const event = JSON.parse(ev.data) as ServerEvent;
        for (const h of this.handlers) h(event);
      } catch {
        // ignore malformed
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      console.log("[ws] desconectado — reconectando em 3s");
      this.reconnectTimer = setTimeout(() => this.openConnection(), RECONNECT_DELAY_MS);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  addHandler(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Throttled position sender
  private lastMoveAt = 0;
  sendMove(playerId: string, x: number, y: number, direction: PlayerState["direction"], animation: string): void {
    const now = Date.now();
    if (now - this.lastMoveAt < 50) return;
    this.lastMoveAt = now;
    this.send({ type: "PLAYER_MOVE", playerId, x, y, direction, animation });
  }

  sendFocusToggle(enable: boolean): void {
    this.send({ type: "FOCUS_TOGGLE", enable });
  }

  sendInvite(toPlayerId: string): void {
    this.send({ type: "INVITE_SEND", toPlayerId });
  }

  sendInviteRespond(inviteId: string, accept: boolean): void {
    this.send({ type: "INVITE_RESPOND", inviteId, accept });
  }

  sendZoneEnter(zoneId: string): void {
    this.send({ type: "ZONE_ENTER", zoneId });
  }

  sendZoneLeave(zoneId: string): void {
    this.send({ type: "ZONE_LEAVE", zoneId });
  }

  sendZoneJoinConfirm(zoneId: string): void {
    this.send({ type: "ZONE_JOIN_CONFIRM", zoneId });
  }

  sendZoneJoinCancel(zoneId: string): void {
    this.send({ type: "ZONE_JOIN_CANCEL", zoneId });
  }

  sendConversationLeave(): void {
    this.send({ type: "CONVERSATION_LEAVE" });
  }

  sendRecado(toPlayerId: string, content: string): void {
    this.send({ type: "RECADO_SEND", toPlayerId, content });
  }

  sendRecadosSeen(): void {
    this.send({ type: "RECADOS_SEEN" });
  }

  sendSpotifySetTrack(zoneId: string, trackUri: string, trackName: string, artistName: string): void {
    this.send({ type: "SPOTIFY_SET_TRACK", zoneId, trackUri, trackName, artistName });
  }

  sendSpotifyToggle(zoneId: string, isPlaying: boolean): void {
    this.send({ type: "SPOTIFY_TOGGLE", zoneId, isPlaying });
  }

  sendChat(content: string): void {
    this.send({ type: "CHAT_SEND", content });
  }

  sendStatusSet(status: "ausente" | "livre"): void {
    this.send({ type: "STATUS_SET", status });
  }
}

export const SocketManager = new SocketManagerClass();

// Wire server events → Zustand stores
// Import here to avoid circular deps — stores don't import SocketManager
export function wireSocketToStores(
  onPlayersSnapshot: (players: PlayerState[], zones: ZoneState[]) => void,
  onPlayerJoin: (player: PlayerState) => void,
  onPlayerLeave: (playerId: string) => void,
  onPlayerMove: (id: string, x: number, y: number, dir: PlayerState["direction"], anim: string) => void,
  onPlayerStatus: (id: string, status: PlayerState["status"]) => void,
  onInviteIncoming: (invite: import("@shared/types").InviteState) => void,
  onInviteResult: (inviteId: string, accepted: boolean, conversation?: Conversation) => void,
  onInviteExpired: (inviteId: string) => void,
  onConversationJoin: (conv: Conversation) => void,
  onConversationUpdate: (conv: Conversation) => void,
  onConversationEnd: (convId: string) => void,
  onZoneJoinPrompt: (payload: import("@shared/events").ServerZoneJoinPrompt) => void,
  onZoneState: (zone: ZoneState) => void,
  onRecadosPending: (messages: import("@shared/types").RecadoMessage[]) => void,
  onError: (msg: string) => void,
  onZoneMusic: (zoneId: string, music: import("@shared/types").ZoneMusic | null) => void,
  onChatMessage: (playerId: string, playerName: string, content: string, sentAt: string) => void,
  onChatHistory: (messages: { id: string; playerId: string; playerName: string; content: string; sentAt: string }[]) => void,
): () => void {
  return SocketManager.addHandler((event) => {
    switch (event.type) {
      case "PLAYERS_SNAPSHOT": onPlayersSnapshot(event.players, event.zones); break;
      case "PLAYER_JOIN": onPlayerJoin(event.player); break;
      case "PLAYER_LEAVE": onPlayerLeave(event.playerId); break;
      case "PLAYER_MOVE": onPlayerMove(event.playerId, event.x, event.y, event.direction, event.animation); break;
      case "PLAYER_STATUS": onPlayerStatus(event.playerId, event.status); break;
      case "INVITE_INCOMING": onInviteIncoming(event.invite); break;
      case "INVITE_RESULT": onInviteResult(event.inviteId, event.accepted, event.conversation); break;
      case "INVITE_EXPIRED": onInviteExpired(event.inviteId); break;
      case "CONVERSATION_JOIN": onConversationJoin(event.conversation); break;
      case "CONVERSATION_UPDATE": onConversationUpdate(event.conversation); break;
      case "CONVERSATION_END": onConversationEnd(event.conversationId); break;
      case "ZONE_JOIN_PROMPT": onZoneJoinPrompt(event); break;
      case "ZONE_STATE": onZoneState(event.zone); break;
      case "RECADOS_PENDING": onRecadosPending(event.messages); break;
      case "ZONE_MUSIC": onZoneMusic(event.zoneId, event.music); break;
      case "CHAT_MESSAGE": onChatMessage(event.playerId, event.playerName, event.content, event.sentAt); break;
      case "CHAT_HISTORY": onChatHistory(event.messages); break;
      case "ERROR": onError(event.message); break;
    }
  });
}
