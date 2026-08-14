import { useState } from "react";
import { useConversationStore } from "../stores/conversationStore";
import { SocketManager } from "../networking/SocketManager";

export function RecadoInputModal() {
  const target = useConversationStore((s) => s.recadoTarget);
  const setRecadoTarget = useConversationStore((s) => s.setRecadoTarget);
  const [text, setText] = useState("");

  if (!target) return null;

  function send() {
    if (!target || !text.trim()) return;
    SocketManager.sendRecado(target.id, text.trim());
    setText("");
    setRecadoTarget(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        zIndex: 600,
      }}
    >
      <div
        style={{
          background: "#F2E2B8",
          border: "4px solid #7a63a8",
          borderRadius: 2,
          padding: "24px 32px",
          minWidth: 320,
          fontFamily: "'Pixelify Sans', monospace",
          color: "#3A2010",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 13, color: "#7a63a8" }}>Recado para</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{target.name}</div>
        <textarea
          autoFocus
          value={text}
          maxLength={500}
          rows={4}
          placeholder="Mensagem..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 14,
            background: "#FDF6E3",
            border: "2px solid #7a63a8",
            borderRadius: 2,
            color: "#3A2010",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={send}
            disabled={!text.trim()}
            style={{
              flex: 1,
              padding: "9px 0",
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 14,
              background: text.trim() ? "#7a63a8" : "#b0a0c8",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              cursor: text.trim() ? "pointer" : "not-allowed",
            }}
          >
            Enviar
          </button>
          <button
            onClick={() => setRecadoTarget(null)}
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
    </div>
  );
}
