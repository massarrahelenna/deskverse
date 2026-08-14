import { useState } from "react";
import { useWorldStore } from "../stores/worldStore";
import { usePlayerStore } from "../stores/playerStore";
import { useConversationStore } from "../stores/conversationStore";
import { useUiStore } from "../stores/uiStore";
import { MessageHistory } from "./MessageHistory";
import type { PlayerStatus } from "@shared/types";

const STATUS_COLOR: Record<PlayerStatus, string> = {
  livre:       "#4caf50",
  em_foco:     "#7a63a8",
  em_reuniao:  "#2196f3",
  ausente:     "#9e9e9e",
  em_descanso: "#D4833A",
};

const STATUS_ORDER: Record<PlayerStatus, number> = {
  livre:       0,
  em_foco:     1,
  em_reuniao:  2,
  em_descanso: 3,
  ausente:     4,
};

export function PeoplePanel() {
  const open = useUiStore((s) => s.showPeople);
  const remotePlayers = useWorldStore((s) => s.remotePlayers);
  const localName = usePlayerStore((s) => s.name);
  const localStatus = usePlayerStore((s) => s.status);
  const setRecadoTarget = useConversationStore((s) => s.setRecadoTarget);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  const allPlayers = [
    { id: "local", name: localName, status: localStatus, isLocal: true },
    ...Object.values(remotePlayers).map((p) => ({ ...p, isLocal: false })),
  ].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <>
      {historyTarget && (
        <MessageHistory
          otherUserId={historyTarget.id}
          otherUserName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      )}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 70,
            left: 14,
            width: 260,
            maxHeight: "calc(100vh - 90px)",
            background: "#F5E2B8",
            border: "4px solid #5B3417",
            boxShadow: "inset 0 0 0 4px #C89A5B, inset 0 0 0 8px #F5E2B8, 3px 3px 0 rgba(45,25,10,.35)",
            zIndex: 195,
            overflowY: "auto",
            fontFamily: "'Pixelify Sans', monospace",
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              fontSize: 16,
              fontWeight: 700,
              color: "#FBEFD2",
              background: "#8B5A2B",
              borderBottom: "3px solid #5B3417",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Pessoas no andar</span>
            <span style={{ color: "#E9C88E", fontSize: 14 }}>
              você + {allPlayers.length - 1}
            </span>
          </div>
          {allPlayers.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderBottom: "2px dotted rgba(122,89,54,.35)",
                background: p.isLocal ? "rgba(217,143,50,.12)" : "transparent",
              }}
            >
              {/* avatar chip */}
              <div style={{
                width: 30, height: 30, flexShrink: 0,
                border: "2px solid #5B3417",
                background: STATUS_COLOR[p.status],
                display: "grid", placeItems: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}>
                {p.name[0]?.toUpperCase()}
              </div>
              <div style={{
                display: "flex", flexDirection: "column",
                lineHeight: 1.2, minWidth: 0, flex: 1,
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: "#4A2E12",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.name}{p.isLocal && " (eu)"}
                </span>
                <small style={{ fontSize: 13, color: STATUS_COLOR[p.status] }}>
                  {p.status.replace("_", " ")}
                </small>
              </div>
              {!p.isLocal && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {p.status === "em_foco" && (
                    <button
                      onClick={() => setRecadoTarget({ id: p.id, name: p.name })}
                      style={{
                        padding: "3px 8px",
                        fontFamily: "'Pixelify Sans', monospace",
                        fontSize: 12,
                        background: "#7a63a8",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Recado
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryTarget({ id: p.id, name: p.name })}
                    style={{
                      padding: "3px 8px",
                      fontFamily: "'Pixelify Sans', monospace",
                      fontSize: 12,
                      background: "#5B3417",
                      color: "#E9D0A0",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Msgs
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
