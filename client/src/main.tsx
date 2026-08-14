import { useEffect } from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LoginPage } from "./pages/LoginPage";
import { LobbyPage } from "./pages/LobbyPage";
import { GamePage } from "./pages/GamePage";
import { useAuthStore } from "./stores/authStore";
import { exchangeSpotifyCode } from "./hooks/useSpotify";

function App() {
  const { user, loading, checkAuth } = useAuthStore();
  const [inGame, setInGame] = useState(false);

  useEffect(() => {
    // After cross-origin Spotify callback: tokens arrive via URL hash at localhost
    if (location.hash.startsWith("#_spt=")) {
      try {
        const [token, refresh, expires] = atob(location.hash.slice(6)).split("|");
        sessionStorage.setItem("spotify_token", token);
        sessionStorage.setItem("spotify_refresh", refresh);
        sessionStorage.setItem("spotify_expires", expires);
      } catch { /* ignore */ }
      history.replaceState({}, "", "/");
      checkAuth();
      return;
    }

    // Handle Spotify OAuth callback (runs at 127.0.0.1:3000/spotify-callback)
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state && location.pathname === "/spotify-callback") {
      exchangeSpotifyCode(code, state).then(() => {
        // Only reached on localhost (127.0.0.1 redirects away); clean up URL
        history.replaceState({}, "", "/");
        checkAuth();
      });
      return;
    }

    // Handle auth result redirect
    const auth = params.get("auth");
    if (auth) history.replaceState({}, "", "/");

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6DA34D",
          fontFamily: "'Pixelify Sans', monospace",
          color: "#E9D0A0",
          fontSize: 18,
        }}
      >
        Carregando…
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (inGame) return <GamePage />;
  return <LobbyPage onEnter={() => setInGame(true)} />;
}

// StrictMode disabled: PixiJS WebGL context breaks on double-mount.
createRoot(document.getElementById("root")!).render(<App />);
