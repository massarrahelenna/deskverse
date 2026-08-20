import { useState } from "react";
import { useUiStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { usePlayerStore } from "../stores/playerStore";

const C = {
  woodDark: "#5B3417",
  woodLite: "#C89A5B",
  parch:    "#F5E2B8",
  parch2:   "#E9D0A0",
  ink:      "#4A2E12",
  inkSoft:  "#7A5936",
};

export function ProfilePanel() {
  const showProfile   = useUiStore((s) => s.showProfile);
  const toggleProfile = useUiStore((s) => s.toggleProfile);
  const user          = useAuthStore((s) => s.user);
  const logout        = useAuthStore((s) => s.logout);
  const playerName    = usePlayerStore((s) => s.name);

  const [name, setName]     = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  if (!showProfile) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.displayName) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", top: 70, right: 14,
      width: 300,
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
        fontSize: 15, letterSpacing: ".04em",
        borderBottom: `3px solid ${C.woodDark}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Perfil</span>
        <button
          onClick={toggleProfile}
          style={{ background: "none", border: "none", color: "#FBEFD2", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {user?.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt="avatar"
            style={{ width: 56, height: 56, border: `3px solid ${C.woodDark}`, alignSelf: "center" }}
          />
        )}

        <div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 3 }}>E-mail</div>
          <div style={{ fontSize: 14, wordBreak: "break-all" }}>{user?.email ?? "—"}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 3 }}>Nome no jogo</div>
          <div style={{ fontSize: 14, color: C.inkSoft }}>{playerName}</div>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, color: C.inkSoft }}>Nome da conta</label>
          <input
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            style={{
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 14,
              background: "#FDF6E3",
              border: `2px solid ${C.woodDark}`,
              color: C.ink,
              padding: "7px 10px",
              outline: "none",
            }}
          />
          {error && <div style={{ fontSize: 12, color: "#c0392b" }}>{error}</div>}
          <button
            type="submit"
            disabled={saving || !name.trim() || name.trim() === user?.displayName}
            style={{
              background: C.parch2,
              border: `3px solid ${C.woodDark}`,
              boxShadow: `inset 0 0 0 3px ${C.woodLite}`,
              color: C.ink,
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 14,
              padding: "8px 0",
              cursor: "pointer",
              opacity: (saving || !name.trim() || name.trim() === user?.displayName) ? 0.5 : 1,
            }}
          >
            {saved ? "Salvo!" : saving ? "Salvando…" : "Salvar nome"}
          </button>
        </form>

        <button
          onClick={() => logout()}
          style={{
            background: "#8B1a1a",
            border: `3px solid #5B0f0f`,
            color: "#FBEFD2",
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: 14,
            padding: "8px 0",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
