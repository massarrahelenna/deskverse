const woodBox: React.CSSProperties = {
  background: "#E9D0A0",
  border: "3px solid #5B3417",
  boxShadow: "inset 0 0 0 3px #C89A5B, 4px 4px 0 rgba(45,25,10,.45)",
  fontFamily: "'Pixelify Sans', monospace",
  color: "#4A2E12",
};

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "12px 0",
  fontSize: 14,
  fontFamily: "'Pixelify Sans', monospace",
  fontWeight: 700,
  letterSpacing: 1,
  cursor: "pointer",
  border: "3px solid #5B3417",
  boxShadow: "inset 0 0 0 2px #C89A5B, 2px 2px 0 rgba(45,25,10,.35)",
};

export function LoginPage() {
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
      }}
    >
      <div style={{ ...woodBox, padding: "40px 48px", minWidth: 340, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 2, color: "#3A2010" }}>DeskVerse</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#7A4A22" }}>Escritório virtual gamificado</p>
        </div>

        <div style={{ borderTop: "2px solid #C89A5B" }} />

        <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: "#5B3417" }}>
          Entre com sua conta para acessar o escritório
        </p>

        {/* Google */}
        <a
          href="/auth/google"
          style={{ textDecoration: "none" }}
        >
          <button
            style={{
              ...btnBase,
              background: "#fff",
              color: "#3A2010",
            }}
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </a>

        {/* GitHub */}
        <a
          href="/auth/github"
          style={{ textDecoration: "none" }}
        >
          <button
            style={{
              ...btnBase,
              background: "#1a1a1a",
              color: "#fff",
              borderColor: "#000",
              boxShadow: "inset 0 0 0 2px #444, 2px 2px 0 rgba(0,0,0,.5)",
            }}
          >
            <GitHubIcon />
            Entrar com GitHub
          </button>
        </a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges">
      <rect x="10" y="2" width="8" height="8" fill="#EA4335" />
      <rect x="2" y="2" width="8" height="8" fill="#4285F4" />
      <rect x="2" y="10" width="8" height="8" fill="#34A853" />
      <rect x="10" y="10" width="8" height="8" fill="#FBBC05" />
      <rect x="7" y="7" width="6" height="6" fill="#fff" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges">
      <rect x="6" y="2" width="8" height="2" fill="#fff" />
      <rect x="4" y="4" width="12" height="2" fill="#fff" />
      <rect x="2" y="6" width="16" height="8" fill="#fff" />
      <rect x="4" y="14" width="4" height="4" fill="#fff" />
      <rect x="12" y="14" width="4" height="4" fill="#fff" />
      <rect x="6" y="10" width="2" height="2" fill="#1a1a1a" />
      <rect x="12" y="10" width="2" height="2" fill="#1a1a1a" />
    </svg>
  );
}
