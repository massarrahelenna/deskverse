import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI: new (domain: string, opts: object) => JitsiAPI;
  }
}

interface JitsiAPI {
  addEventListener(event: string, cb: () => void): void;
  executeCommand(cmd: string): void;
  dispose(): void;
}

interface Props {
  meetUrl: string;
  displayName: string;
  onHangup: () => void;
}

// Extracts room name from https://meet.jit.si/deskverse-<id>
function roomFromUrl(url: string): string {
  return url.split("/").pop() ?? url;
}

const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;
let scriptLoaded = false;
let scriptLoading = false;
const waiters: Array<() => void> = [];

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) { resolve(); return; }
    waiters.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      scriptLoaded = true;
      waiters.forEach((fn) => fn());
      waiters.length = 0;
    };
    document.body.appendChild(s);
  });
}

export function JitsiPanel({ meetUrl, displayName, onHangup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    loadJitsiScript().then(() => {
      if (disposed || !containerRef.current) return;
      setLoading(false);

      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: roomFromUrl(meetUrl),
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "chat", "tileview"],
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: "#1E3A38",
          MOBILE_APP_PROMO: false,
        },
        userInfo: { displayName },
      });

      apiRef.current.addEventListener("readyToClose", () => {
        if (!disposed) onHangup();
      });
    });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [meetUrl, displayName, onHangup]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,   // sits above MeetingHUD (52px) + gap
        right: 16,
        width: 480,
        height: 360,
        background: "#0f2320",
        border: "3px solid #4E8F86",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        zIndex: 250,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Pixelify Sans', monospace",
      }}
    >
      {/* title bar */}
      <div
        style={{
          height: 28,
          background: "#1E3A38",
          borderBottom: "2px solid #4E8F86",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 8, height: 8, background: "#4caf50", flexShrink: 0 }} />
        <span style={{ color: "#4E8F86", fontSize: 11, flex: 1 }}>
          Jitsi Meet — {roomFromUrl(meetUrl)}
        </span>
      </div>

      {/* jitsi container */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4E8F86",
              fontSize: 13,
            }}
          >
            Carregando Jitsi…
          </div>
        )}
      </div>
    </div>
  );
}
