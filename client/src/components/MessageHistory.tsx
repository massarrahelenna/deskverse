import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";

interface Message {
  id:         string;
  senderId:   string;
  receiverId: string;
  content:    string;
  createdAt:  string;
  senderName: string | null;
}

interface Props {
  otherUserId:   string;
  otherUserName: string;
  onClose: () => void;
}

export function MessageHistory({ otherUserId, otherUserName, onClose }: Props) {
  const myId = usePlayerStore((s) => s.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/messages/${otherUserId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => { setMessages(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const res = await fetch(`/api/messages/${otherUserId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const msg = await res.json() as Message;
      setMessages((prev) => [...prev, { ...msg, senderName: null }]);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#E9D0A0",
          border: "3px solid #5B3417",
          boxShadow: "inset 0 0 0 3px #C89A5B, 4px 4px 0 rgba(45,25,10,.5)",
          fontFamily: "'Pixelify Sans', monospace",
          color: "#3A2010",
          width: 400,
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "2px solid #C89A5B",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700 }}>Conversa com {otherUserName}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#5B3417", fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 360,
            minHeight: 120,
          }}
        >
          {loading && <div style={{ color: "#9A6A32", fontSize: 12 }}>Carregando…</div>}
          {!loading && messages.length === 0 && (
            <div style={{ color: "#9A6A32", fontSize: 12 }}>Nenhuma mensagem ainda.</div>
          )}
          {messages.map((msg) => {
            const mine = msg.senderId === myId;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                {!mine && (
                  <div style={{ fontSize: 10, color: "#9A6A32", marginBottom: 2 }}>
                    {msg.senderName ?? otherUserName}
                  </div>
                )}
                <div
                  style={{
                    background: mine ? "#5B3417" : "#FDF6E3",
                    color: mine ? "#E9D0A0" : "#3A2010",
                    border: "2px solid " + (mine ? "#3A2010" : "#C89A5B"),
                    padding: "6px 10px",
                    fontSize: 12,
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#9A6A32",
                    marginTop: 2,
                    textAlign: mine ? "right" : "left",
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 14px",
            borderTop: "2px solid #C89A5B",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem…"
            maxLength={500}
            style={{
              flex: 1,
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 12,
              background: "#FDF6E3",
              border: "2px solid #7A4A22",
              color: "#3A2010",
              padding: "7px 10px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            style={{
              background: "#5B3417",
              border: "2px solid #3A2010",
              color: "#E9D0A0",
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 12,
              padding: "7px 14px",
              cursor: "pointer",
              opacity: !text.trim() ? 0.5 : 1,
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
