import { useState } from "react";
import { useConversationStore } from "../stores/conversationStore";
import { useWorldStore } from "../stores/worldStore";
import { usePlayerStore } from "../stores/playerStore";
import { SocketManager } from "../networking/SocketManager";
import { JitsiPanel } from "./JitsiPanel";

// Pixel-art camera icon
function CameraIcon({ on }: { on: boolean }) {
  const c = on ? "#7dd3fc" : "#4E8F86";
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" shapeRendering="crispEdges">
      <rect x="0" y="2" width="10" height="8" fill={c} />
      <rect x="10" y="0" width="6" height="5" fill={c} />
      <rect x="10" y="7" width="6" height="5" fill={c} />
    </svg>
  );
}

export function MeetingHUD() {
  const conv = useConversationStore((s) => s.activeConversation);
  const remotePlayers = useWorldStore((s) => s.remotePlayers);
  const localName = usePlayerStore((s) => s.name);
  const [videoOpen, setVideoOpen] = useState(false);

  if (!conv) return null;

  const participantNames = conv.participants.map(
    (id) => remotePlayers[id]?.name ?? (id === usePlayerStore.getState().id ? localName : id)
  );

  return (
    <>
      {videoOpen && (
        <JitsiPanel
          meetUrl={conv.meetUrl}
          displayName={localName}
          onHangup={() => {
            setVideoOpen(false);
            SocketManager.sendConversationLeave();
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#1E3A38",
          borderTop: "3px solid #4E8F86",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 52,
          gap: 12,
          zIndex: 300,
          fontFamily: "'Pixelify Sans', monospace",
          userSelect: "none",
        }}
      >
        {/* pulse dot */}
        <div
          style={{
            width: 10,
            height: 10,
            background: "#4caf50",
            flexShrink: 0,
            animation: "pulse 1.5s infinite",
          }}
        />

        <span style={{ color: "#4E8F86", fontSize: 13, fontWeight: 700 }}>
          Reuniao ativa
        </span>

        <div style={{ width: 2, height: 24, background: "#4E8F86" }} />

        <span style={{ color: "#a0c4c2", fontSize: 13 }}>
          {participantNames.join(" · ")}
        </span>

        <div style={{ flex: 1 }} />

        {/* Video toggle */}
        <button
          onClick={() => setVideoOpen((v) => !v)}
          title={videoOpen ? "Fechar vídeo" : "Abrir vídeo"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 14px",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 13,
            background: videoOpen ? "#163d60" : "#1E3A38",
            color: videoOpen ? "#7dd3fc" : "#4E8F86",
            border: `2px solid ${videoOpen ? "#7dd3fc" : "#4E8F86"}`,
            cursor: "pointer",
          }}
        >
          <CameraIcon on={videoOpen} />
          {videoOpen ? "Fechar vídeo" : "Abrir vídeo"}
        </button>

        {/* Leave */}
        <button
          onClick={() => {
            setVideoOpen(false);
            SocketManager.sendConversationLeave();
          }}
          style={{
            padding: "6px 14px",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 13,
            background: "#7A2020",
            color: "#F2E2B8",
            border: "2px solid #a03030",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>
    </>
  );
}
