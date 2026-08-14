import { useState, useEffect } from "react";
import { useSpotify, startSpotifyAuth, disconnectSpotify } from "../hooks/useSpotify";
import { usePlayerStore } from "../stores/playerStore";
import { useUiStore } from "../stores/uiStore";
import { SocketManager } from "../networking/SocketManager";
import type { ZoneMusic } from "@shared/types";

const SPOTIFY_CONFIGURED = !!import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const MUSIC_ZONE = "musica";

interface Props {
  inMusicRoom: boolean;
  zoneMusic: ZoneMusic | null;
}

// ── vinyl store palette ───────────────────────────────────────────────────────
const V = {
  bg:       "#150E07",
  bgCard:   "#1F1509",
  border:   "#6B4E28",
  gold:     "#D4A853",
  goldDim:  "#9A7040",
  cream:    "#F0DEB8",
  creamDim: "#9A8060",
  green:    "#1DB954",
  red:      "#ef4444",
  amber:    "#E88C30",
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 70,
  right: 14,
  width: 292,
  background: V.bg,
  border: `3px solid ${V.border}`,
  boxShadow: `inset 0 0 0 1px ${V.goldDim}, 4px 4px 0 rgba(0,0,0,.6)`,
  fontFamily: "'Pixelify Sans', monospace",
  color: V.cream,
  zIndex: 200,
};

// ── vinyl record SVG ──────────────────────────────────────────────────────────
function VinylIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11"  fill="#0A0604" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#1C120A" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#1C120A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#1C120A" strokeWidth="1" />
      <circle cx="12" cy="12" r="3.8" fill="#D4A853" />
      <circle cx="12" cy="12" r="1.3" fill="#0A0604" />
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export function SpotifyPanel({ inMusicRoom, zoneMusic }: Props) {
  const { state, playTrack, pause, resume, isAuthenticated } = useSpotify();
  const open          = useUiStore((s) => s.showSpotify);
  const toggleSpotify = useUiStore((s) => s.toggleSpotify);
  const myId          = usePlayerStore((s) => s.id);

  // Auto-sync playback only when inside the music room
  useEffect(() => {
    if (!inMusicRoom || !zoneMusic || !state.connected) return;
    if (!zoneMusic.isPlaying) { pause(); return; }
    const positionMs = Math.max(0, Date.now() - zoneMusic.startedAt);
    if (state.trackUri !== zoneMusic.trackUri) {
      playTrack(zoneMusic.trackUri, positionMs);
    }
  }, [inMusicRoom, zoneMusic, state.connected, state.trackUri, pause, playTrack]);

  const isDJ = !!(zoneMusic?.djId && zoneMusic.djId === myId);

  if (!open) return null;

  return (
    <div style={panelStyle}>
      {/* ── header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px",
        borderBottom: `2px solid ${V.border}`,
        background: V.bgCard,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 700, color: V.gold }}>
          <VinylIcon size={26} />
          Sala de Música
        </span>
        <button onClick={toggleSpotify} style={{
          background: "none", border: "none", cursor: "pointer",
          color: V.goldDim, fontSize: 20, lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* ── not configured ── */}
        {!SPOTIFY_CONFIGURED && (
          <div style={{ fontSize: 13, color: V.creamDim, lineHeight: 1.6 }}>
            Adicione{" "}
            <code style={{ background: V.bgCard, padding: "1px 5px", color: V.gold }}>VITE_SPOTIFY_CLIENT_ID</code>
            {" "}no{" "}
            <code style={{ background: V.bgCard, padding: "1px 5px", color: V.gold }}>.env</code>
            {" "}e reinicie.
          </div>
        )}

        {/* ── not logged in ── */}
        {SPOTIFY_CONFIGURED && !isAuthenticated && (
          <>
            <button
              onClick={() => startSpotifyAuth().catch(console.error)}
              style={{
                width: "100%", padding: "13px 0",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: V.green, border: `2px solid #158a3e`,
                color: "#fff", fontFamily: "'Pixelify Sans', monospace",
                fontSize: 16, cursor: "pointer", fontWeight: 700,
              }}
            >
              Conectar Spotify
            </button>
            <div style={{ fontSize: 12, color: V.creamDim, lineHeight: 1.5, wordBreak: "break-all" }}>
              Redirect URI:{" "}
              <strong style={{ color: V.gold }}>{location.origin}/spotify-callback</strong>
            </div>
          </>
        )}

        {/* ── logged in ── */}
        {SPOTIFY_CONFIGURED && isAuthenticated && (
          <>
            {/* location badge */}
            <div style={{
              fontSize: 13, padding: "7px 11px",
              background: inMusicRoom ? "rgba(212,168,83,.12)" : V.bgCard,
              border: `1px solid ${inMusicRoom ? V.gold : V.border}`,
              color: inMusicRoom ? V.gold : V.creamDim,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <VinylIcon size={14} />
              {inMusicRoom
                ? "Você está na Sala de Música"
                : "Vá até a Sala de Música para ouvir ao vivo"}
            </div>

            {/* SDK error */}
            {state.error && (
              <div style={{
                fontSize: 13, padding: "7px 11px", lineHeight: 1.5,
                background: "rgba(239,68,68,.12)",
                border: `1px solid rgba(239,68,68,.4)`,
                color: "#fca5a5",
              }}>
                {state.error}
              </div>
            )}

            {/* SDK connection status (only while connecting, no error) */}
            {!state.connected && !state.error && (
              <div style={{ fontSize: 13, color: V.creamDim }}>
                Conectando ao Spotify Player…
              </div>
            )}

            {/* currently playing in the room */}
            {zoneMusic ? (
              <div style={{
                background: V.bgCard, border: `1px solid ${V.border}`,
                padding: "10px 12px", display: "flex", alignItems: "center", gap: 12,
              }}>
                <VinylIcon size={40} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: V.cream,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {zoneMusic.trackName}
                  </div>
                  <div style={{ fontSize: 14, color: V.gold, marginTop: 3 }}>
                    {zoneMusic.artistName}
                  </div>
                  <div style={{ fontSize: 12, color: V.creamDim, marginTop: 4 }}>
                    DJ: {zoneMusic.djName}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: V.creamDim, textAlign: "center", padding: "4px 0" }}>
                Nenhuma música tocando na sala
              </div>
            )}

            {/* DJ controls — shown when authenticated (not gated by SDK) */}
            <DJControls
              isDJ={isDJ}
              connected={state.connected}
              isPlaying={zoneMusic?.isPlaying ?? false}
              onSetTrack={(uri, name, artist) =>
                SocketManager.sendSpotifySetTrack(MUSIC_ZONE, uri, name, artist)
              }
              onToggle={(playing) => {
                SocketManager.sendSpotifyToggle(MUSIC_ZONE, playing);
                if (playing) resume(); else pause();
              }}
            />

            {/* reconnect / logout */}
            <button
              onClick={() => {
                disconnectSpotify();
                window.location.reload();
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: V.creamDim, fontSize: 12, textDecoration: "underline",
                textAlign: "right", padding: 0,
              }}
            >
              Desconectar Spotify
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── DJ controls ───────────────────────────────────────────────────────────────
function DJControls({ isDJ, connected, isPlaying, onSetTrack, onToggle }: {
  isDJ: boolean;
  connected: boolean;
  isPlaying: boolean;
  onSetTrack: (uri: string, name: string, artist: string) => void;
  onToggle: (playing: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSet(e: React.FormEvent) {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    const uri = (raw.includes("open.spotify.com") && raw.includes("/track/"))
      ? "spotify:track:" + raw.split("/track/")[1].split("?")[0]
      : raw.startsWith("spotify:track:") ? raw : null;
    if (!uri) {
      setFeedback("Link inválido — cole uma URL do Spotify");
      return;
    }
    onSetTrack(uri, "Faixa compartilhada", "Spotify");
    setInput("");
    setFeedback("Música enviada para a sala!");
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <>
      <div style={{ borderTop: `1px solid ${V.border}` }} />

      {/* Play/pause — only if DJ and SDK is connected */}
      {isDJ && connected && (
        <button
          onClick={() => onToggle(!isPlaying)}
          style={{
            background: isPlaying ? V.red : V.green,
            border: "none", color: "#fff",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 15, padding: "11px 0",
            cursor: "pointer", width: "100%", fontWeight: 700,
          }}
        >
          {isPlaying ? "⏸ Pausar para todos" : "▶ Tocar para todos"}
        </button>
      )}

      {/* Track input — always shown when authenticated */}
      <form onSubmit={handleSet} style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cole um link do Spotify…"
          style={{
            flex: 1, fontSize: 14,
            fontFamily: "'Pixelify Sans', monospace",
            background: V.bgCard, border: `2px solid ${V.border}`,
            color: V.cream, padding: "8px 10px", outline: "none",
          }}
        />
        <button type="submit" style={{
          background: V.gold, border: `2px solid ${V.goldDim}`,
          color: V.bg, fontFamily: "'Pixelify Sans', monospace",
          fontSize: 15, padding: "8px 12px", cursor: "pointer", fontWeight: 700,
        }}>▶</button>
      </form>

      {feedback && (
        <div style={{ fontSize: 13, color: feedback.includes("inválido") ? V.red : V.green }}>
          {feedback}
        </div>
      )}

      {!connected && (
        <div style={{ fontSize: 12, color: V.creamDim, lineHeight: 1.5 }}>
          Precisa de Spotify Premium para tocar música no navegador. Você ainda pode compartilhar links.
        </div>
      )}
    </>
  );
}
