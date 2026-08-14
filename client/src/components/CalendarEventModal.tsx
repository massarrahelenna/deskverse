import { useState, useEffect } from "react";

const C = {
  woodDark: "#5B3417",
  woodLite: "#C89A5B",
  parch:    "#F5E2B8",
  parch2:   "#E9D0A0",
  ink:      "#4A2E12",
  inkSoft:  "#7A5936",
  green:    "#3F7D3A",
};

interface Props {
  onClose: () => void;
  prefill?: {
    title?: string;
    description?: string;
    meetUrl?: string;
    startAt?: string;
    endAt?: string;
  };
}

function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CalendarEventModal({ onClose, prefill }: Props) {
  const now    = new Date();
  const later  = new Date(now.getTime() + 60 * 60 * 1000);

  const [title,    setTitle]    = useState(prefill?.title       ?? "Reunião no DeskVerse");
  const [desc,     setDesc]     = useState(prefill?.description ?? "");
  const [startAt,  setStartAt]  = useState(prefill?.startAt     ?? toLocalIso(now));
  const [endAt,    setEndAt]    = useState(prefill?.endAt        ?? toLocalIso(later));
  const [emails,   setEmails]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ link: string } | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/calendar/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setConnected(d.connected ?? false))
      .catch(() => setConnected(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          title,
          description: desc,
          startAt:     new Date(startAt).toISOString(),
          endAt:       new Date(endAt).toISOString(),
          attendeeEmails: emails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean),
          meetUrl:     prefill?.meetUrl,
        }),
      });
      const data = await res.json() as { htmlLink?: string; error?: string };
      if (!res.ok || !data.htmlLink) {
        setError(data.error === "google_calendar_not_connected"
          ? "Conecte sua conta Google com acesso ao Agenda (faça login novamente)."
          : "Erro ao criar evento. Tente novamente.");
      } else {
        setResult({ link: data.htmlLink });
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(45,25,10,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 400,
    }}>
      <div style={{
        width: 400,
        background: C.parch,
        border: `4px solid ${C.woodDark}`,
        boxShadow: `inset 0 0 0 4px ${C.woodLite}, 4px 4px 0 rgba(45,25,10,.4)`,
        fontFamily: "'Pixelify Sans', monospace",
        color: C.ink,
      }}>
        {/* header */}
        <div style={{
          background: "#8B5A2B", color: "#FBEFD2",
          padding: "8px 14px",
          fontSize: 15, fontWeight: 700,
          borderBottom: `3px solid ${C.woodDark}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>📅 Criar evento no Google Agenda</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#FBEFD2", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {connected === false && (
            <div style={{
              background: "#FDE8C8", border: `2px solid ${C.woodLite}`,
              padding: "8px 12px", fontSize: 13, marginBottom: 14, lineHeight: 1.5,
            }}>
              Sua conta Google não tem acesso ao Google Agenda ainda.<br />
              <a href="/auth/google" style={{ color: C.woodDark, fontWeight: 700 }}>Faça login novamente</a> para liberar o acesso.
            </div>
          )}

          {result ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>Evento criado com sucesso!</div>
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: C.green, color: "#fff",
                  border: `2px solid #2a5a20`,
                  padding: "8px 20px",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Ver no Google Agenda ↗
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Título">
                <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
                  style={inputStyle} />
              </Field>
              <Field label="Descrição (opcional)">
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={500}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Início" style={{ flex: 1 }}>
                  <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required
                    style={inputStyle} />
                </Field>
                <Field label="Fim" style={{ flex: 1 }}>
                  <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required
                    style={inputStyle} />
                </Field>
              </div>
              <Field label="Convidar (e-mails, separados por vírgula)">
                <input value={emails} onChange={(e) => setEmails(e.target.value)}
                  placeholder="ana@exemplo.com, carlos@exemplo.com"
                  style={inputStyle} />
              </Field>

              {error && (
                <div style={{ fontSize: 12, color: "#c0392b", lineHeight: 1.5 }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || connected === false}
                style={{
                  background: C.green, color: "#fff",
                  border: `2px solid #2a5a20`,
                  fontFamily: "'Pixelify Sans', monospace",
                  fontSize: 14,
                  padding: "10px 0",
                  cursor: loading || connected === false ? "not-allowed" : "pointer",
                  opacity: loading || connected === false ? 0.6 : 1,
                }}
              >
                {loading ? "Criando…" : "Criar evento"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "'Pixelify Sans', monospace",
  fontSize: 13,
  background: "#FDF6E3",
  border: `2px solid ${C.woodDark}`,
  color: C.ink,
  padding: "6px 8px",
  outline: "none",
  boxSizing: "border-box",
};
