import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { GameLoop } from "../game/GameLoop";
import type { GameMap, ZoneMusic } from "@shared/types";
import officeMap from "../assets/maps/office.json";
import { SocketManager, wireSocketToStores } from "../networking/SocketManager";
import { usePlayerStore } from "../stores/playerStore";
import { useWorldStore } from "../stores/worldStore";
import { useConversationStore } from "../stores/conversationStore";
import { useChatStore } from "../stores/chatStore";
import { StatusBar } from "../components/StatusBar";
import { InviteModal } from "../components/InviteModal";
import { ZoneJoinPrompt } from "../components/ZoneJoinPrompt";
import { MeetingHUD } from "../components/MeetingHUD";
import { ProximityPrompt } from "../components/ProximityPrompt";
import { RecadosModal } from "../components/RecadosModal";
import { RecadoInputModal } from "../components/RecadoInputModal";
import { PeoplePanel } from "../components/PeoplePanel";
import { ErrorToast } from "../components/ErrorToast";
import { SpotifyPanel } from "../components/SpotifyPanel";
import { ChatPanel } from "../components/ChatPanel";
import { CalendarEventModal } from "../components/CalendarEventModal";
import { ProfilePanel } from "../components/ProfilePanel";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function showRecadoNotification(fromName: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("DeskVerse — Novo recado", {
      body: `${fromName} deixou um recado para você.`,
    });
  }
}

export function GamePage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameLoop | null>(null);
  const [zoneMusicMap, setZoneMusicMap] = useState<Record<string, ZoneMusic>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [gameReady, setGameReady] = useState(false);

  const MUSIC_ZONE = "musica";
  const myId = usePlayerStore((s) => s.id);
  const zones = useWorldStore((s) => s.zones);
  const currentZoneId = zones.find((z) => z.occupants.includes(myId))?.zoneId ?? null;
  const inMusicRoom = currentZoneId === MUSIC_ZONE;
  const musicZoneMusic = zoneMusicMap[MUSIC_ZONE] ?? null;

  useEffect(() => {
    requestNotificationPermission();

    const { name, avatarSkin, shirtIndex, hairColor, accessory, pantsColor } = usePlayerStore.getState();
    SocketManager.connect(name, avatarSkin, shirtIndex, hairColor, accessory, pantsColor);

    const unwire = wireSocketToStores(
      (players, zones) => {
        const myId = usePlayerStore.getState().id;
        useWorldStore.getState().setSnapshot(
          players.filter((p) => p.id !== myId),
          zones
        );
        gameRef.current?.resetZoneDetector();
      },
      (player) => {
        const myId = usePlayerStore.getState().id;
        if (player.id !== myId) useWorldStore.getState().addRemotePlayer(player);
      },
      (playerId) => useWorldStore.getState().removeRemotePlayer(playerId),
      (pid, x, y, dir, anim) => useWorldStore.getState().updateRemoteMove(pid, x, y, dir, anim),
      (pid, status) => {
        const myId = usePlayerStore.getState().id;
        if (pid === myId) usePlayerStore.getState().setStatus(status);
        else useWorldStore.getState().updateRemoteStatus(pid, status);
      },
      (invite) => useConversationStore.getState().setInvite(invite),
      (_inviteId, accepted, conversation) => {
        useConversationStore.getState().setSentInviteId(null);
        if (accepted && conversation) useConversationStore.getState().setConversation(conversation);
      },
      (_inviteId) => {
        useConversationStore.getState().setInvite(null);
        useConversationStore.getState().setSentInviteId(null);
      },
      (conv) => useConversationStore.getState().setConversation(conv),
      (conv) => useConversationStore.getState().setConversation(conv),
      (_convId) => useConversationStore.getState().setConversation(null),
      (prompt) => useConversationStore.getState().setZonePrompt(prompt),
      (zone) => useWorldStore.getState().updateZoneState(zone),
      (messages) => {
        useConversationStore.getState().setPendingRecados(messages);
        if (messages.length > 0) showRecadoNotification(messages[0].fromName);
      },
      (msg) => useConversationStore.getState().setError(msg),
      (zoneId, music) => {
        setZoneMusicMap((prev) => ({ ...prev, [zoneId]: music as ZoneMusic }));
      },
      (playerId, playerName, content, sentAt) => {
        const myId = usePlayerStore.getState().id;
        useChatStore.getState().addMessage({ playerId, playerName, content, sentAt, isLocal: playerId === myId });
        if (playerId === myId) {
          gameRef.current?.showLocalChatBubble(content);
        } else {
          gameRef.current?.showRemoteChatBubble(playerId, content);
        }
      },
      (messages) => {
        useChatStore.getState().loadHistory(
          messages.map((m) => ({ ...m, isLocal: false }))
        );
      },
    );

    return () => {
      unwire();
      SocketManager.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;
    let game: GameLoop | null = null;
    let app: PIXI.Application | null = null;

    (async () => {
      app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x6DA34D,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed || !canvasRef.current) {
        app.destroy(true);
        return;
      }

      canvasRef.current.appendChild(app.canvas);

      const handleResize = () => app?.renderer.resize(window.innerWidth, window.innerHeight);
      window.addEventListener("resize", handleResize);

      game = new GameLoop(app, officeMap as unknown as GameMap);
      gameRef.current = game;
      await game.init();

      if (destroyed) {
        window.removeEventListener("resize", handleResize);
        game.destroy();
        app.destroy(true);
        return;
      }

      setGameReady(true);
    })();

    return () => {
      destroyed = true;
      gameRef.current = null;
      game?.destroy();
      app?.destroy(true);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />

      {!gameReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#6DA34D",
          fontFamily: "'Pixelify Sans', monospace",
          color: "#E9D0A0",
          fontSize: 20,
          zIndex: 999,
        }}>
          Carregando escritório…
        </div>
      )}

      <StatusBar onOpenCalendar={() => setCalendarOpen(true)} />
      <PeoplePanel />
      <ProximityPrompt />
      <ZoneJoinPrompt />
      <InviteModal />
      <MeetingHUD />
      <RecadosModal />
      <RecadoInputModal />
      <ErrorToast />
      <SpotifyPanel inMusicRoom={inMusicRoom} zoneMusic={musicZoneMusic} />
      <ChatPanel />
      <ProfilePanel />
      {calendarOpen && <CalendarEventModal onClose={() => setCalendarOpen(false)} />}
    </div>
  );
}
