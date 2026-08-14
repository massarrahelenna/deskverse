import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import type { ClientEvent } from "../../shared/events/index.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import { persistMessage } from "../routes/messages.js";
import { ZoneMusicManager } from "../spotify/ZoneMusicManager.js";

interface JoinQuery {
  name?:       string;
  avatarSkin?: string;
  shirtIndex?: string;
  hairColor?:  string;
  accessory?:  string;
  pantsColor?: string;
}

const zoneMusicManager = new ZoneMusicManager();

export function createWsHandler(_app: FastifyInstance, roomManager: RoomManager) {
  return async (socket: WebSocket, request: FastifyRequest) => {
    let playerId: string;
    try {
      const payload = await request.jwtVerify<{ userId: string }>();
      playerId = payload.userId;
    } catch (err) {
      console.error("[ws] auth failed:", err);
      socket.close(1008, "Autenticação necessária");
      return;
    }

    const q = request.query as JoinQuery;
    const name = (q.name ?? "Anônimo").slice(0, 32);
    const avatarSkin = ["light", "medium", "dark"].includes(q.avatarSkin ?? "")
      ? (q.avatarSkin as string)
      : "medium";
    const shirtIndex = Math.min(Math.max(parseInt(q.shirtIndex ?? "0", 10), 0), 4);
    const hairColor  = /^#[0-9a-fA-F]{6}$/.test(q.hairColor ?? "") ? q.hairColor! : "#2c1a0e";
    const accessory  = ["none", "hat", "glasses"].includes(q.accessory ?? "") ? q.accessory as "none" | "hat" | "glasses" : "none";
    const pantsColor = /^#[0-9a-fA-F]{6}$/.test(q.pantsColor ?? "") ? q.pantsColor! : "#334155";

    roomManager.addPlayer(socket, {
      id: playerId,
      name,
      x: 240,
      y: 420,
      direction: "down",
      animation: "idle",
      avatarSkin,
      shirtIndex,
      hairColor,
      accessory,
      pantsColor,
      status: "livre",
    });

    // Send current zone music to the joining player
    for (const [zoneId, music] of zoneMusicManager.entries()) {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: "ZONE_MUSIC", zoneId, music }));
      }
    }

    socket.on("message", (raw: Buffer) => {
      let event: ClientEvent;
      try {
        event = JSON.parse(raw.toString()) as ClientEvent;
      } catch {
        return;
      }

      switch (event.type) {
        case "PLAYER_MOVE":
          roomManager.updatePosition(
            playerId, event.x, event.y, event.direction, event.animation
          );
          break;

        case "FOCUS_TOGGLE":
          roomManager.toggleFocus(playerId, event.enable);
          break;

        case "ZONE_ENTER":
          roomManager.playerEnterZone(playerId, event.zoneId);
          break;

        case "ZONE_LEAVE":
          roomManager.playerLeaveZone(playerId, event.zoneId);
          break;

        case "ZONE_JOIN_CONFIRM":
          roomManager.playerConfirmZoneJoin(playerId, event.zoneId);
          break;

        case "ZONE_JOIN_CANCEL":
          roomManager.playerCancelZoneJoin(playerId, event.zoneId);
          break;

        case "INVITE_SEND":
          roomManager.sendInvite(playerId, event.toPlayerId);
          break;

        case "INVITE_RESPOND":
          roomManager.respondToInvite(event.inviteId, playerId, event.accept);
          break;

        case "CONVERSATION_LEAVE":
          roomManager.leaveConversation(playerId, false);
          break;

        case "RECADO_SEND":
          roomManager.sendRecado(playerId, event.toPlayerId, event.content);
          persistMessage(playerId, event.toPlayerId, event.content).catch(console.error);
          break;

        case "RECADOS_SEEN":
          roomManager.markRecadosSeen(playerId);
          break;

        case "SPOTIFY_SET_TRACK": {
          const music = {
            trackUri:   event.trackUri,
            trackName:  event.trackName,
            artistName: event.artistName,
            startedAt:  Date.now(),
            isPlaying:  true,
            djId:       playerId,
            djName:     name,
          };
          zoneMusicManager.set(event.zoneId, music);
          roomManager.broadcastToZone(event.zoneId, {
            type: "ZONE_MUSIC",
            zoneId: event.zoneId,
            music,
          });
          break;
        }

        case "SPOTIFY_TOGGLE": {
          const updated = zoneMusicManager.togglePlayback(event.zoneId, event.isPlaying);
          if (updated) {
            roomManager.broadcastToZone(event.zoneId, {
              type: "ZONE_MUSIC",
              zoneId: event.zoneId,
              music: updated,
            });
          }
          break;
        }

        case "CHAT_SEND": {
          const content = event.content.trim().slice(0, 200);
          if (!content) break;
          roomManager.broadcast({
            type:       "CHAT_MESSAGE",
            playerId,
            playerName: name,
            content,
            sentAt:     new Date().toISOString(),
          });
          break;
        }

        default:
          break;
      }
    });

    socket.on("close", () => {
      roomManager.removePlayer(playerId);
    });

    socket.on("error", (err: Error) => {
      console.error(`[ws] erro de ${playerId}:`, err.message);
      roomManager.removePlayer(playerId);
    });
  };
}
