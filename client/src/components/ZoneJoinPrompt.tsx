import { useEffect, useRef, useState } from "react";
import { useConversationStore } from "../stores/conversationStore";
import { SocketManager } from "../networking/SocketManager";

export function ZoneJoinPrompt() {
  const prompt = useConversationStore((s) => s.zoneJoinPrompt);
  const setZonePrompt = useConversationStore((s) => s.setZonePrompt);
  const [msLeft, setMsLeft] = useState(0);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!prompt) return;
    confirmedRef.current = false;
    const endAt = Date.now() + prompt.countdownMs;
    setMsLeft(prompt.countdownMs);

    const iv = setInterval(() => {
      const rem = endAt - Date.now();
      if (rem <= 0) {
        clearInterval(iv);
        setMsLeft(0);
        if (!confirmedRef.current) {
          confirmedRef.current = true;
          SocketManager.sendZoneJoinConfirm(prompt.zoneId);
          setZonePrompt(null);
        }
      } else {
        setMsLeft(rem);
      }
    }, 100);

    return () => clearInterval(iv);
  }, [prompt, setZonePrompt]);

  if (!prompt) return null;

  function confirmNow() {
    if (!prompt || confirmedRef.current) return;
    confirmedRef.current = true;
    SocketManager.sendZoneJoinConfirm(prompt.zoneId);
    setZonePrompt(null);
  }

  function cancel() {
    if (!prompt) return;
    confirmedRef.current = true;
    SocketManager.sendZoneJoinCancel(prompt.zoneId);
    setZonePrompt(null);
  }

  const secsLeft = Math.ceil(msLeft / 1000);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 400,
        background: "#F2E2B8",
        border: "4px solid #4E8F86",
        borderRadius: 2,
        padding: "24px 32px",
        fontFamily: "'Pixelify Sans', monospace",
        color: "#3A2010",
        minWidth: 300,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 13, color: "#4E8F86" }}>{prompt.zoneName}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        Entrando em {secsLeft}s...
      </div>
      {prompt.participants.length > 0 && (
        <div style={{ fontSize: 13, color: "#7A4A22" }}>
          Ja dentro: {prompt.participants.join(", ")}
        </div>
      )}
      {prompt.meetUrl && (
        <div style={{ fontSize: 12, color: "#9e9e9e", wordBreak: "break-all" }}>
          {prompt.meetUrl}
        </div>
      )}
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
            width: `${(msLeft / prompt.countdownMs) * 100}%`,
            background: "#4E8F86",
            transition: "width 0.1s linear",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={confirmNow}
          style={{
            flex: 1,
            padding: "9px 0",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 14,
            background: "#4E8F86",
            color: "#fff",
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          Entrar agora
        </button>
        <button
          onClick={cancel}
          style={{
            flex: 1,
            padding: "9px 0",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 14,
            background: "#7A4A22",
            color: "#F2E2B8",
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
