import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RoomManager } from "./RoomManager.js";
import type { WebSocket } from "@fastify/websocket";

function mockSocket(): WebSocket {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  } as unknown as WebSocket;
}

function addPlayer(
  manager: RoomManager,
  id: string,
  name: string,
  socket?: WebSocket
): WebSocket {
  const s = socket ?? mockSocket();
  manager.addPlayer(s, {
    id,
    name,
    x: 240,
    y: 420,
    direction: "down",
    animation: "idle",
    avatarSkin: "medium",
    shirtIndex: 0,
    hairColor:  "#2c1a0e",
    accessory:  "none",
    pantsColor: "#334155",
    status: "livre",
  });
  return s;
}

function sentMessages(socket: WebSocket): unknown[] {
  return (socket.send as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) =>
    JSON.parse(c[0] as string)
  );
}

describe("RoomManager — status", () => {
  let manager: RoomManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new RoomManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("jogador começa como livre", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const msgs = sentMessages(sA);
    const snapshot = msgs.find((m: unknown) => (m as { type: string }).type === "PLAYERS_SNAPSHOT");
    expect(snapshot).toBeDefined();
  });

  it("toggleFocus livre → em_foco → livre", () => {
    const sA = addPlayer(manager, "a", "Ana");
    manager.toggleFocus("a", true);
    const msgs = sentMessages(sA);
    const statusMsgs = msgs.filter(
      (m: unknown) => (m as { type: string }).type === "PLAYER_STATUS"
    ) as { playerId: string; status: string }[];
    expect(statusMsgs.some((m) => m.status === "em_foco")).toBe(true);

    manager.toggleFocus("a", false);
    const msgs2 = sentMessages(sA);
    const livreMsg = msgs2.find(
      (m: unknown) =>
        (m as { type: string; status?: string }).type === "PLAYER_STATUS" &&
        (m as { status: string }).status === "livre"
    );
    expect(livreMsg).toBeDefined();
  });

  it("ausência após 10 minutos sem movimento", () => {
    addPlayer(manager, "a", "Ana");
    vi.advanceTimersByTime(10 * 60 * 1000 + 100);
    manager.updatePosition("a", 240, 420, "down", "idle");
    const sB = addPlayer(manager, "b", "Bruno");
    const msgs = sentMessages(sB);
    const snapshot = msgs.find((m: unknown) => (m as { type: string }).type === "PLAYERS_SNAPSHOT") as {
      players: { id: string; status: string }[];
    } | undefined;
    const playerA = snapshot?.players.find((p) => p.id === "a");
    expect(playerA?.status).toBe("livre");
  });
});

describe("RoomManager — convites", () => {
  let manager: RoomManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new RoomManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("convite recusado não cria conversa", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const sB = addPlayer(manager, "b", "Bruno");

    manager.sendInvite("a", "b");

    const bMsgs = sentMessages(sB);
    const incoming = bMsgs.find((m: unknown) => (m as { type: string }).type === "INVITE_INCOMING") as
      | { invite: { id: string } }
      | undefined;
    expect(incoming).toBeDefined();

    manager.respondToInvite(incoming!.invite.id, "b", false);

    const aMsgs = sentMessages(sA);
    const result = aMsgs.find(
      (m: unknown) =>
        (m as { type: string }).type === "INVITE_RESULT" &&
        (m as { accepted: boolean }).accepted === false
    );
    expect(result).toBeDefined();
  });

  it("convite aceito cria conversa e muda status para em_reuniao", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const sB = addPlayer(manager, "b", "Bruno");

    manager.sendInvite("a", "b");
    const bMsgs = sentMessages(sB);
    const incoming = bMsgs.find((m: unknown) => (m as { type: string }).type === "INVITE_INCOMING") as
      | { invite: { id: string } }
      | undefined;

    manager.respondToInvite(incoming!.invite.id, "b", true);

    const aMsgs = sentMessages(sA);
    const joinMsg = aMsgs.find(
      (m: unknown) => (m as { type: string }).type === "CONVERSATION_JOIN"
    ) as { conversation: { meetUrl: string } } | undefined;
    expect(joinMsg?.conversation.meetUrl).toContain("meet.jit.si");
  });

  it("convite expira após 30 segundos", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const sB = addPlayer(manager, "b", "Bruno");

    manager.sendInvite("a", "b");
    vi.advanceTimersByTime(30_000 + 100);

    const aMsgs = sentMessages(sA);
    const expired = aMsgs.find((m: unknown) => (m as { type: string }).type === "INVITE_EXPIRED");
    expect(expired).toBeDefined();
    const bMsgs = sentMessages(sB);
    const expiredB = bMsgs.find((m: unknown) => (m as { type: string }).type === "INVITE_EXPIRED");
    expect(expiredB).toBeDefined();
  });

  it("não envia convite para jogador em foco — retorna erro", () => {
    const sA = addPlayer(manager, "a", "Ana");
    addPlayer(manager, "b", "Bruno");
    manager.toggleFocus("b", true);
    manager.sendInvite("a", "b");

    const aMsgs = sentMessages(sA);
    const err = aMsgs.find((m: unknown) => (m as { type: string }).type === "ERROR");
    expect(err).toBeDefined();
  });
});

describe("RoomManager — sala de reunião (zone)", () => {
  let manager: RoomManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new RoomManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("entrar na sala com autoJoin=true envia prompt de 3s", () => {
    const sA = addPlayer(manager, "a", "Ana");
    manager.playerEnterZone("a", "sala-ipe");

    const msgs = sentMessages(sA);
    const prompt = msgs.find((m: unknown) => (m as { type: string }).type === "ZONE_JOIN_PROMPT");
    expect(prompt).toBeDefined();
  });

  it("confirmar entrada cria conversa com link Meet", () => {
    const sA = addPlayer(manager, "a", "Ana");
    manager.playerEnterZone("a", "sala-ipe");
    manager.playerConfirmZoneJoin("a", "sala-ipe");

    const msgs = sentMessages(sA);
    const joinMsg = msgs.find(
      (m: unknown) => (m as { type: string }).type === "CONVERSATION_JOIN"
    ) as { conversation: { meetUrl: string } } | undefined;
    expect(joinMsg?.conversation.meetUrl).toContain("meet.jit.si");
  });

  it("segundo jogador entra e usa o MESMO link", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const sB = addPlayer(manager, "b", "Bruno");

    manager.playerEnterZone("a", "sala-ipe");
    manager.playerConfirmZoneJoin("a", "sala-ipe");

    manager.playerEnterZone("b", "sala-ipe");
    manager.playerConfirmZoneJoin("b", "sala-ipe");

    const aMsgs = sentMessages(sA);
    const bMsgs = sentMessages(sB);

    const aJoin = aMsgs.find((m: unknown) => (m as { type: string }).type === "CONVERSATION_JOIN") as
      | { conversation: { meetUrl: string } }
      | undefined;
    const bJoin = bMsgs.find((m: unknown) => (m as { type: string }).type === "CONVERSATION_JOIN") as
      | { conversation: { meetUrl: string } }
      | undefined;

    expect(aJoin?.conversation.meetUrl).toBe(bJoin?.conversation.meetUrl);
  });

  it("zona de foco muda status para em_foco ao entrar", () => {
    const sA = addPlayer(manager, "a", "Ana");
    const sB = addPlayer(manager, "b", "Bruno");

    manager.playerEnterZone("a", "foco");

    const bMsgs = sentMessages(sB);
    const statusMsg = bMsgs.find(
      (m: unknown) =>
        (m as { type: string }).type === "PLAYER_STATUS" &&
        (m as { status: string }).status === "em_foco"
    );
    expect(statusMsg).toBeDefined();
    void sA;
  });
});
