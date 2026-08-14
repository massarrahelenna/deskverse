import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (opts: SpotifyPlayerOptions) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (state: unknown) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  setVolume(v: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: { name: string; artists: Array<{ name: string }>; uri: string } };
}

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
// Spotify blocks localhost — must use 127.0.0.1 as redirect URI
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/spotify-callback";
const SCOPES = "streaming user-read-email user-read-private user-modify-playback-state";

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generatePKCE() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(digest) };
}

export async function startSpotifyAuth(): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) throw new Error("VITE_SPOTIFY_CLIENT_ID not set");
  const { verifier, challenge } = await generatePKCE();
  // Encode verifier in state so it survives the cross-origin redirect to 127.0.0.1
  const state = btoa(verifier);
  const params = new URLSearchParams({
    client_id:             SPOTIFY_CLIENT_ID,
    response_type:         "code",
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPES,
    code_challenge_method: "S256",
    code_challenge:        challenge,
    state,
  });
  location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeSpotifyCode(code: string, state: string): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) return;
  let verifier: string;
  try {
    verifier = atob(state);
  } catch {
    console.error("[spotify] failed to decode verifier from state");
    return;
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     SPOTIFY_CLIENT_ID,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  const data = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (data.access_token) {
    const expiresAt = String(Date.now() + (data.expires_in ?? 3600) * 1000);
    // If callback landed on 127.0.0.1, pass tokens back to localhost via hash fragment
    if (location.hostname === "127.0.0.1") {
      const payload = btoa([data.access_token, data.refresh_token ?? "", expiresAt].join("|"));
      location.href = `http://localhost:${location.port}/#_spt=${payload}`;
      return;
    }
    sessionStorage.setItem("spotify_token", data.access_token);
    sessionStorage.setItem("spotify_refresh", data.refresh_token ?? "");
    sessionStorage.setItem("spotify_expires", expiresAt);
  }
}

async function refreshSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID) return null;
  const refresh = sessionStorage.getItem("spotify_refresh");
  if (!refresh) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     SPOTIFY_CLIENT_ID,
      grant_type:    "refresh_token",
      refresh_token: refresh,
    }),
  });
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (data.access_token) {
    sessionStorage.setItem("spotify_token", data.access_token);
    sessionStorage.setItem("spotify_expires", String(Date.now() + (data.expires_in ?? 3600) * 1000));
    return data.access_token;
  }
  return null;
}

async function getValidToken(): Promise<string | null> {
  const token = sessionStorage.getItem("spotify_token");
  const expires = parseInt(sessionStorage.getItem("spotify_expires") ?? "0");
  if (!token) return null;
  if (Date.now() > expires - 60_000) {
    return refreshSpotifyToken();
  }
  return token;
}

// ── SDK loader ────────────────────────────────────────────────────────────────

let sdkLoading: Promise<void> | null = null;

function loadSpotifySDK(): Promise<void> {
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise((resolve) => {
    if (window.Spotify) { resolve(); return; }
    window.onSpotifyWebPlaybackSDKReady = resolve;
    const s = document.createElement("script");
    s.src = "https://sdk.scdn.co/spotify-player.js";
    document.head.appendChild(s);
  });
  return sdkLoading;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface SpotifyState {
  connected: boolean;
  deviceId:  string | null;
  playing:   boolean;
  trackName: string | null;
  artist:    string | null;
  trackUri:  string | null;
  error:     string | null;
}

export function useSpotify() {
  const [state, setState] = useState<SpotifyState>({
    connected: false,
    deviceId:  null,
    playing:   false,
    trackName: null,
    artist:    null,
    trackUri:  null,
    error:     null,
  });
  const playerRef = useRef<SpotifyPlayer | null>(null);

  const isAuthenticated = !!sessionStorage.getItem("spotify_token");

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    (async () => {
      await loadSpotifySDK();
      if (cancelled) return;

      const token = await getValidToken();
      if (!token || cancelled) return;

      const player = new window.Spotify.Player({
        name: "DeskVerse",
        getOAuthToken: async (cb) => {
          const t = await getValidToken();
          if (t) cb(t);
        },
        volume: 0.5,
      });
      playerRef.current = player;

      player.addListener("ready", (data: unknown) => {
        const { device_id } = data as { device_id: string };
        setState((s) => ({ ...s, connected: true, deviceId: device_id }));
      });

      player.addListener("not_ready", () => {
        setState((s) => ({ ...s, connected: false, deviceId: null }));
      });

      player.addListener("initialization_error", (data: unknown) => {
        const msg = (data as { message?: string })?.message ?? "Erro ao inicializar player";
        setState((s) => ({ ...s, error: msg }));
      });

      player.addListener("authentication_error", () => {
        setState((s) => ({ ...s, error: "Token expirado — reconecte o Spotify" }));
      });

      player.addListener("account_error", () => {
        setState((s) => ({ ...s, error: "Spotify Premium é necessário para tocar música" }));
      });

      player.addListener("player_state_changed", (ps: unknown) => {
        const state = ps as SpotifyPlaybackState | null;
        if (!state) return;
        const track = state.track_window.current_track;
        setState((s) => ({
          ...s,
          playing:   !state.paused,
          trackName: track?.name ?? null,
          artist:    track?.artists[0]?.name ?? null,
          trackUri:  track?.uri ?? null,
        }));
      });

      await player.connect();
    })();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [isAuthenticated]);

  const playTrack = useCallback(async (trackUri: string, positionMs = 0) => {
    const token = await getValidToken();
    const deviceId = playerRef.current ? state.deviceId : null;
    if (!token || !deviceId) return;
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method:  "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
    });
  }, [state.deviceId]);

  const pause = useCallback(async () => {
    await playerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);

  return { state, playTrack, pause, resume, isAuthenticated };
}

export function disconnectSpotify(): void {
  sessionStorage.removeItem("spotify_token");
  sessionStorage.removeItem("spotify_refresh");
  sessionStorage.removeItem("spotify_expires");
}
