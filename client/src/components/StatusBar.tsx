import { usePlayerStore } from "../stores/playerStore";
import { useWorldStore } from "../stores/worldStore";
import { useUiStore } from "../stores/uiStore";
import { useChatStore } from "../stores/chatStore";
import { SocketManager } from "../networking/SocketManager";
import type { PlayerStatus } from "@shared/types";

// ─── palette ─────────────────────────────────────────────────────────────────
const C = {
  woodDark:  "#5B3417",
  woodLite:  "#C89A5B",
  parch:     "#F5E2B8",
  parch2:    "#E9D0A0",
  parchHov:  "#F7EBCB",
  ink:       "#4A2E12",
  inkSoft:   "#7A5936",
  green:     "#3F7D3A",
  amber:     "#D98F32",
  violet:    "#6E4E9E",
};

const STATUS_COLOR: Record<PlayerStatus, string> = {
  livre:        C.green,
  em_foco:      C.violet,
  em_reuniao:   "#3F6EA8",
  ausente:      "#9e9e9e",
  em_descanso:  "#D4833A",
};

const STATUS_LABEL: Record<PlayerStatus, string> = {
  livre:        "livre",
  em_foco:      "em foco",
  em_reuniao:   "reunião",
  ausente:      "ausente",
  em_descanso:  "em pausa",
};

const iconBtn: React.CSSProperties = {
  width: 46,
  height: 46,
  padding: 0,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  background: C.parch2,
  border: `3px solid ${C.woodDark}`,
  boxShadow: `inset 0 0 0 3px ${C.woodLite}, 2px 2px 0 rgba(45,25,10,.35)`,
  color: C.ink,
  fontFamily: "'Pixelify Sans', monospace",
  position: "relative" as const,
};

const woodBtn: React.CSSProperties = {
  ...iconBtn,
  width: "auto",
  padding: "0 16px",
  fontSize: 16,
  letterSpacing: 0.5,
  whiteSpace: "nowrap" as const,
};

// ─── pixel-art SVG icons ──────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg viewBox="0 0 11 11" width={22} height={22} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <rect x="4" y="1" width="3" height="2"/>
      <rect x="4" y="4" width="3" height="6"/>
      <rect x="2" y="8" width="7" height="2"/>
      <rect x="2" y="4" width="2" height="2"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 13 11" width={22} height={22} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <rect x="2" y="1" width="3" height="3"/>
      <rect x="1" y="5" width="5" height="5"/>
      <rect x="8" y="2" width="3" height="3"/>
      <rect x="7" y="6" width="5" height="4"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 13 11" width={22} height={22} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <rect x="0" y="0" width="13" height="8" />
      <rect x="0" y="8" width="1" height="1" />
      <rect x="1" y="9" width="1" height="1" />
      <rect x="2" y="10" width="1" height="1" />
      <rect x="3" y="9" width="1" height="1" />
      <rect x="4" y="8" width="1" height="1" />
      <rect x="3" y="2" width="7" height="1" fill={C.parch} />
      <rect x="2" y="4" width="9" height="1" fill={C.parch} />
      <rect x="3" y="6" width="5" height="1" fill={C.parch} />
    </svg>
  );
}

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 13 9" width={22} height={22} shapeRendering="crispEdges" fill={active ? C.violet : "currentColor"} aria-hidden>
      <rect x="3"  y="0" width="7" height="1"/>
      <rect x="1"  y="1" width="11" height="1"/>
      <rect x="0"  y="2" width="3" height="2"/>
      <rect x="3"  y="2" width="7" height="5"/>
      <rect x="10" y="2" width="3" height="2"/>
      <rect x="0"  y="4" width="3" height="3"/>
      <rect x="10" y="4" width="3" height="3"/>
      <rect x="1"  y="7" width="11" height="1"/>
      <rect x="3"  y="8" width="7" height="1"/>
    </svg>
  );
}

// Real Spotify logo — green circle with 3 sound-wave arcs
function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      {/* top arc (widest) */}
      <path d="M6.5 9.5 Q12 6 17.5 9.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* middle arc */}
      <path d="M7.5 13 Q12 9.5 16.5 13" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* bottom arc (narrowest) */}
      <path d="M8.5 16.5 Q12 13.5 15.5 16.5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Pixel-art calendar icon
function CalendarIcon() {
  return (
    <svg viewBox="0 0 14 14" width={22} height={22} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      {/* outer frame */}
      <rect x="0" y="2" width="14" height="12" />
      {/* white inside */}
      <rect x="1" y="4" width="12" height="9" fill={C.parch2} />
      {/* header */}
      <rect x="1" y="2" width="12" height="2" fill={C.woodDark} />
      {/* binding pegs */}
      <rect x="3" y="0" width="2" height="4" fill={C.woodLite} />
      <rect x="9" y="0" width="2" height="4" fill={C.woodLite} />
      {/* grid dots (days) */}
      <rect x="2"  y="6" width="2" height="2" fill={C.inkSoft} />
      <rect x="6"  y="6" width="2" height="2" fill={C.inkSoft} />
      <rect x="10" y="6" width="2" height="2" fill={C.inkSoft} />
      <rect x="2"  y="10" width="2" height="2" fill={C.inkSoft} />
      <rect x="6"  y="10" width="2" height="2" fill={C.inkSoft} />
      {/* highlighted day */}
      <rect x="10" y="10" width="2" height="2" fill={C.green} />
    </svg>
  );
}

interface StatusBarProps {
  onOpenCalendar?: () => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function StatusBar({ onOpenCalendar }: StatusBarProps) {
  const name          = usePlayerStore((s) => s.name);
  const status        = usePlayerStore((s) => s.status);
  const shirtIndex    = usePlayerStore((s) => s.shirtIndex);
  const totalOnline   = useWorldStore((s) => Object.keys(s.remotePlayers).length + 1);
  const showPeople    = useUiStore((s) => s.showPeople);
  const showAbout     = useUiStore((s) => s.showAbout);
  const showSpotify   = useUiStore((s) => s.showSpotify);
  const togglePeople  = useUiStore((s) => s.togglePeople);
  const toggleAbout   = useUiStore((s) => s.toggleAbout);
  const toggleSpotify = useUiStore((s) => s.toggleSpotify);
  const chatOpen      = useChatStore((s) => s.open);
  const chatUnread    = useChatStore((s) => s.unread);
  const toggleChat    = useChatStore((s) => s.toggleOpen);

  const isFocused      = status === "em_foco";
  const canToggleFocus = status === "livre" || status === "em_foco";

  const SHIRT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f97316"];
  const avatarColor  = SHIRT_COLORS[shirtIndex] ?? C.amber;
  const initial      = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <>
      {/* ── top-left toolbar ────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 14, left: 14,
        display: "flex", gap: 8, zIndex: 200,
      }}>
        {/* Info */}
        <button
          style={{ ...iconBtn, background: showAbout ? C.parch : C.parch2 }}
          title="Sobre o DeskVerse"
          onClick={toggleAbout}
        >
          <InfoIcon />
        </button>

        {/* People */}
        <button
          style={{ ...iconBtn, background: showPeople ? C.parch : C.parch2 }}
          title="Quem está no andar"
          onClick={togglePeople}
        >
          <PeopleIcon />
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18,
            background: C.woodDark, color: C.parch,
            fontSize: 12, fontFamily: "'Pixelify Sans', monospace",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
            border: `1px solid ${C.woodLite}`,
          }}>
            {totalOnline}
          </span>
        </button>

        {/* Chat geral */}
        <button
          style={{ ...iconBtn, background: chatOpen ? C.parch : C.parch2 }}
          title="Chat do escritório"
          onClick={toggleChat}
        >
          <ChatIcon />
          {chatUnread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 18, height: 18,
              background: "#ef4444", color: "#fff",
              fontSize: 12, fontFamily: "'Pixelify Sans', monospace",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 3px",
              border: `1px solid ${C.woodLite}`,
            }}>
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </button>

        {/* Spotify */}
        <button
          style={{ ...iconBtn, background: showSpotify ? C.parch : C.parch2 }}
          title="Spotify – música na Copa"
          onClick={toggleSpotify}
        >
          <SpotifyIcon />
        </button>

        {/* Google Agenda */}
        {onOpenCalendar && (
          <button
            style={{ ...iconBtn }}
            title="Criar evento no Google Agenda"
            onClick={onOpenCalendar}
          >
            <CalendarIcon />
          </button>
        )}
      </div>

      {/* ── center toolbar: focus ────────────────────────────────────────────── */}
      {canToggleFocus && (
        <div style={{
          position: "fixed", top: 14,
          left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, zIndex: 200,
        }}>
          <button
            style={{
              ...woodBtn,
              background: isFocused ? "#d4c9f0" : C.parch2,
              color: isFocused ? C.violet : C.ink,
              boxShadow: `inset 0 0 0 3px ${isFocused ? "#9a83c8" : C.woodLite}, 2px 2px 0 rgba(45,25,10,.35)`,
            }}
            title={isFocused ? "Sair do foco" : "Entrar em foco"}
            onClick={() => SocketManager.sendFocusToggle(!isFocused)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EyeIcon active={isFocused} />
              {isFocused ? "Sair do foco" : "Foco"}
            </span>
          </button>
        </div>
      )}

      {/* ── top-right: player card ───────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 14, right: 14,
        display: "flex", gap: 8, alignItems: "stretch", zIndex: 200,
      }}>
        <div style={{
          ...iconBtn,
          width: "auto",
          padding: "0 16px 0 10px",
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "default",
        }}>
          <div style={{
            width: 30, height: 30,
            background: avatarColor,
            border: `2px solid ${C.woodDark}`,
            display: "grid", placeItems: "center",
            fontSize: 16, fontWeight: 700,
            color: "#3B240E", flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, fontSize: 15 }}>
            <span style={{ color: C.ink, fontWeight: 500 }}>{name}</span>
            <small style={{ fontSize: 13, color: STATUS_COLOR[status], fontFamily: "'Pixelify Sans', monospace" }}>
              {STATUS_LABEL[status]}
            </small>
          </div>
        </div>
      </div>

      {/* ── "sobre" panel ────────────────────────────────────────────────────── */}
      {showAbout && (
        <div style={{
          position: "fixed", top: 70, left: 14,
          width: 320,
          background: C.parch,
          border: `4px solid ${C.woodDark}`,
          boxShadow: `inset 0 0 0 4px ${C.woodLite}, inset 0 0 0 8px ${C.parch}, 3px 3px 0 rgba(45,25,10,.35)`,
          zIndex: 195,
          fontFamily: "'Pixelify Sans', monospace",
          color: C.ink,
        }}>
          <div style={{
            background: "#8B5A2B", color: "#FBEFD2",
            padding: "7px 14px",
            fontSize: 15, fontWeight: 400, letterSpacing: ".04em",
            borderBottom: `3px solid ${C.woodDark}`,
          }}>
            DeskVerse
          </div>
          <div style={{ padding: "12px 16px", fontSize: 15, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 10px" }}>
              <strong>O que é.</strong> Escritório virtual gamificado com WebSocket em tempo real, avatares personalizados e videochamada via Jitsi.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Como usar.</strong> WASD para andar. Pressione{" "}
              <kbd style={{ background: "#8B5A2B", color: "#FBEFD2", padding: "0 6px", fontSize: 13, border: `1px solid ${C.woodDark}` }}>E</kbd>{" "}
              perto de alguém para convidar.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Copa.</strong> Entre na Copa para ouvir e controlar a música compartilhada.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
