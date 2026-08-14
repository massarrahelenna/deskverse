import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import { usePlayerStore } from "../stores/playerStore";
import { SocketManager } from "../networking/SocketManager";

const C = {
  woodDark: "#5B3417",
  woodLite: "#C89A5B",
  parch:    "#F5E2B8",
  parch2:   "#E9D0A0",
  ink:      "#4A2E12",
  inkSoft:  "#7A5936",
};

export function ChatPanel() {
  const { messages, open, markRead } = useChatStore();
  const myId = usePlayerStore((s) => s.id);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      markRead();
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length, markRead]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim().slice(0, 200);
    if (!text) return;
    SocketManager.sendChat(text);
    setInput("");
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 16,
      right: 16,
      width: 320,
      height: 400,
      display: "flex",
      flexDirection: "column",
      background: C.parch,
      border: `3px solid ${C.woodDark}`,
      boxShadow: `inset 0 0 0 3px ${C.woodLite}, 3px 3px 0 rgba(45,25,10,.4)`,
      fontFamily: "'Pixelify Sans', monospace",
      color: C.ink,
      zIndex: 210,
    }}>
      {/* header */}
      <div style={{
        padding: "8px 14px",
        background: "#8B5A2B",
        color: "#FBEFD2",
        fontSize: 16,
        fontWeight: 700,
        borderBottom: `2px solid ${C.woodDark}`,
        flexShrink: 0,
        letterSpacing: ".03em",
      }}>
        Chat do escritório
      </div>

      {/* messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 14, color: C.inkSoft, textAlign: "center", marginTop: 24 }}>
            Nenhuma mensagem ainda.<br />Diga olá!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.playerId === myId;
          return (
            <div key={msg.id} style={{
              alignSelf: isMe ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}>
              {!isMe && (
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 3, fontWeight: 600 }}>
                  {msg.playerName}
                </div>
              )}
              <div style={{
                background: isMe ? "#D4B98A" : C.parch2,
                border: `2px solid ${C.woodLite}`,
                padding: "7px 10px",
                fontSize: 15,
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
              <div style={{
                fontSize: 12, color: C.inkSoft, marginTop: 2,
                textAlign: isMe ? "right" : "left",
              }}>
                {new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <form onSubmit={handleSend} style={{
        display: "flex",
        gap: 6,
        padding: "8px 10px",
        borderTop: `2px solid ${C.woodLite}`,
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem…"
          maxLength={200}
          style={{
            flex: 1,
            fontSize: 14,
            fontFamily: "'Pixelify Sans', monospace",
            background: "#FDF6E3",
            border: `2px solid ${C.woodDark}`,
            color: C.ink,
            padding: "7px 10px",
            outline: "none",
          }}
        />
        <button type="submit" style={{
          background: "#5B3417",
          border: `2px solid #3A2010`,
          color: C.parch,
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: 17,
          padding: "6px 12px",
          cursor: "pointer",
        }}>
          ▶
        </button>
      </form>
    </div>
  );
}
