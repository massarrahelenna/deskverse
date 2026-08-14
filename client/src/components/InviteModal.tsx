import { useEffect, useRef, useState } from "react";
import { useConversationStore } from "../stores/conversationStore";
import { SocketManager } from "../networking/SocketManager";

export function InviteModal() {
  const invite = useConversationStore((s) => s.pendingInvite);
  const setInvite = useConversationStore((s) => s.setInvite);
  const [secsLeft, setSecsLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!invite) return;
    const expiresAt = new Date(invite.expiresAt).getTime();
    setSecsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        setInvite(null);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [invite, setInvite]);

  if (!invite) return null;

  function accept() {
    if (!invite) return;
    SocketManager.sendInviteRespond(invite.id, true);
    setInvite(null);
  }

  function decline() {
    if (!invite) return;
    SocketManager.sendInviteRespond(invite.id, false);
    setInvite(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        zIndex: 500,
      }}
    >
      <div
        style={{
          background: "#F2E2B8",
          border: "4px solid #7A4A22",
          borderRadius: 2,
          padding: "28px 36px",
          minWidth: 320,
          fontFamily: "'Pixelify Sans', monospace",
          color: "#3A2010",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 13, color: "#7A4A22" }}>Convite recebido</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {invite.fromName} quer conversar
        </div>
        <div style={{ fontSize: 13, color: "#9e9e9e" }}>
          Expira em {secsLeft}s
        </div>
        <div
          style={{
            height: 4,
            background: "#CE9C5C",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(secsLeft / 30) * 100}%`,
              background: "#7A4A22",
              transition: "width 0.5s linear",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={accept}
            style={{
              flex: 1,
              padding: "10px 0",
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 15,
              background: "#4caf50",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            Aceitar
          </button>
          <button
            onClick={decline}
            style={{
              flex: 1,
              padding: "10px 0",
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 15,
              background: "#7A4A22",
              color: "#F2E2B8",
              border: "none",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            Recusar
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#9e9e9e", textAlign: "center" }}>
          Aceitar abre o Meet em uma nova aba
        </div>
      </div>
    </div>
  );
}
