import { useConversationStore } from "../stores/conversationStore";
import { SocketManager } from "../networking/SocketManager";

export function RecadosModal() {
  const recados = useConversationStore((s) => s.pendingRecados);
  const setRecados = useConversationStore((s) => s.setPendingRecados);

  if (recados.length === 0) return null;

  function dismiss() {
    SocketManager.sendRecadosSeen();
    setRecados([]);
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
        zIndex: 700,
      }}
    >
      <div
        style={{
          background: "#F2E2B8",
          border: "4px solid #7a63a8",
          borderRadius: 2,
          padding: "28px 36px",
          minWidth: 340,
          maxWidth: 480,
          maxHeight: "70vh",
          fontFamily: "'Pixelify Sans', monospace",
          color: "#3A2010",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 13, color: "#7a63a8" }}>Recados recebidos durante o foco</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {recados.length} recado{recados.length > 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {recados.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#FDF6E3",
                border: "2px solid #CE9C5C",
                borderRadius: 2,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {r.fromName}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.content}</div>
              <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 6 }}>
                {new Date(r.sentAt).toLocaleTimeString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={dismiss}
          style={{
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
          Ok, entendi
        </button>
      </div>
    </div>
  );
}
