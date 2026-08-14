import { useConversationStore } from "../stores/conversationStore";
import { useWorldStore } from "../stores/worldStore";
import { usePlayerStore } from "../stores/playerStore";
import { SocketManager } from "../networking/SocketManager";

export function ProximityPrompt() {
  const nearbyIds = useConversationStore((s) => s.nearbyPlayerIds);
  const remotePlayers = useWorldStore((s) => s.remotePlayers);
  const myStatus = usePlayerStore((s) => s.status);
  const setSentInviteId = useConversationStore((s) => s.setSentInviteId);
  const setRecadoTarget = useConversationStore((s) => s.setRecadoTarget);
  const activeConv = useConversationStore((s) => s.activeConversation);

  if (nearbyIds.length === 0 || activeConv) return null;
  if (myStatus === "em_reuniao" || myStatus === "ausente") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
      }}
    >
      {nearbyIds.map((id) => {
        const player = remotePlayers[id];
        if (!player) return null;
        const canInvite = myStatus === "livre" && player.status === "livre";
        const canRecado = player.status === "em_foco";

        return (
          <div
            key={id}
            style={{
              background: "#F2E2B8",
              border: "2px solid #7A4A22",
              borderRadius: 2,
              padding: "8px 16px",
              fontFamily: "'Pixelify Sans', monospace",
              color: "#3A2010",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <span style={{ fontWeight: 700 }}>{player.name}</span>
            {canInvite && (
              <button
                onClick={() => {
                  SocketManager.sendInvite(id);
                  setSentInviteId(id);
                }}
                style={btnStyle("#7A4A22", "#F2E2B8")}
              >
                <kbd style={{
                  display: "inline-block",
                  padding: "0px 4px",
                  marginRight: 4,
                  fontSize: 10,
                  background: "#5B3417",
                  color: "#F2E2B8",
                  border: "1px solid #9A7A4A",
                  borderRadius: 2,
                  lineHeight: "14px",
                }}>E</kbd>
                Chamar
              </button>
            )}
            {canRecado && (
              <button
                onClick={() => setRecadoTarget({ id, name: player.name })}
                style={btnStyle("#7a63a8", "#fff")}
              >
                Deixar recado
              </button>
            )}
            {!canInvite && !canRecado && (
              <span style={{ color: "#9e9e9e" }}>{statusHint(player.status)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontFamily: "'Pixelify Sans', monospace",
    fontSize: 12,
    background: bg,
    color,
    border: "none",
    borderRadius: 2,
    cursor: "pointer",
  };
}

function statusHint(status: string): string {
  if (status === "em_reuniao") return "Em reuniao";
  if (status === "ausente") return "Ausente";
  if (status === "em_foco") return "Em foco";
  return "";
}
