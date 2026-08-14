import { useState } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useAuthStore } from "../stores/authStore";
import type { Accessory } from "@shared/types";

const STORAGE_NAME   = "dv_player_name";
const STORAGE_SKIN   = "dv_player_skin";
const STORAGE_SHIRT  = "dv_player_shirt";
const STORAGE_HAIR   = "dv_player_hair";
const STORAGE_ACC    = "dv_player_accessory";
const STORAGE_PANTS  = "dv_player_pants";

const SKINS = [
  { id: "light",  hex: "#f5c5a3", label: "Clara"  },
  { id: "medium", hex: "#c68642", label: "Média"  },
  { id: "dark",   hex: "#8d4a28", label: "Escura" },
] as const;

const SHIRTS = [
  { index: 0, hex: "#3b82f6" },
  { index: 1, hex: "#ef4444" },
  { index: 2, hex: "#22c55e" },
  { index: 3, hex: "#a855f7" },
  { index: 4, hex: "#f97316" },
] as const;

const HAIRS = [
  { hex: "#2c1a0e", label: "Castanho escuro" },
  { hex: "#f5c518", label: "Loiro"           },
  { hex: "#e05c00", label: "Ruivo"           },
  { hex: "#aaaaaa", label: "Grisalho"        },
  { hex: "#1a1a1a", label: "Preto"           },
] as const;

const PANTS_COLORS = [
  { hex: "#334155", label: "Azul marinho" },
  { hex: "#1e3a1e", label: "Verde escuro" },
  { hex: "#3b1a1a", label: "Vinho"        },
  { hex: "#555555", label: "Cinza"        },
  { hex: "#8B5A2B", label: "Caramelo"     },
] as const;

const ACCESSORIES: { id: Accessory; label: string; emoji: string }[] = [
  { id: "none",    label: "Nenhum", emoji: "—"  },
  { id: "hat",     label: "Chapéu", emoji: "🎩" },
  { id: "glasses", label: "Óculos", emoji: "👓" },
];

// Wood-frame button style matching the prototype
const woodBox: React.CSSProperties = {
  background: "#E9D0A0",
  border: "3px solid #5B3417",
  boxShadow: "inset 0 0 0 3px #C89A5B, 2px 2px 0 rgba(45,25,10,.35)",
  fontFamily: "'Pixelify Sans', monospace",
  color: "#4A2E12",
};

interface LobbyPageProps {
  onEnter: () => void;
}

export function LobbyPage({ onEnter }: LobbyPageProps) {
  const authUser = useAuthStore((s) => s.user);
  const [name,       setName]       = useState(() => sessionStorage.getItem(STORAGE_NAME)  ?? authUser?.displayName ?? "");
  const [skin,       setSkin]       = useState(() => sessionStorage.getItem(STORAGE_SKIN)   ?? "medium");
  const [shirtIndex, setShirtIndex] = useState(() => parseInt(sessionStorage.getItem(STORAGE_SHIRT) ?? "0", 10));
  const [hairColor,  setHairColor]  = useState(() => sessionStorage.getItem(STORAGE_HAIR)  ?? "#2c1a0e");
  const [accessory,  setAccessory]  = useState<Accessory>(() => (sessionStorage.getItem(STORAGE_ACC) as Accessory) ?? "none");
  const [pantsColor, setPantsColor] = useState(() => sessionStorage.getItem(STORAGE_PANTS) ?? "#334155");
  const init = usePlayerStore((s) => s.init);

  const skinHex  = SKINS.find((s) => s.id === skin)?.hex ?? "#c68642";
  const shirtHex = SHIRTS[shirtIndex]?.hex ?? "#3b82f6";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed || !authUser) return;

    sessionStorage.setItem(STORAGE_NAME,  trimmed);
    sessionStorage.setItem(STORAGE_SKIN,  skin);
    sessionStorage.setItem(STORAGE_SHIRT, String(shirtIndex));
    sessionStorage.setItem(STORAGE_HAIR,  hairColor);
    sessionStorage.setItem(STORAGE_ACC,   accessory);
    sessionStorage.setItem(STORAGE_PANTS, pantsColor);

    init(authUser.id, trimmed, skin, shirtIndex, hairColor, accessory, pantsColor);
    onEnter();
  }

  const disabled = !name.trim() || !authUser;

  return (
    <div
      style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#6DA34D",
        fontFamily: "'Pixelify Sans', monospace",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          ...woodBox,
          padding: "36px 44px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          minWidth: 340,
          boxShadow: "inset 0 0 0 3px #C89A5B, 4px 4px 0 rgba(45,25,10,.45)",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 2, color: "#3A2010" }}>DeskVerse</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#7A4A22" }}>Escritorio virtual gamificado</p>
        </div>

        <div style={{ borderTop: "2px solid #C89A5B" }} />

        {/* Avatar preview */}
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <AvatarPreview
            skinHex={skinHex} shirtHex={shirtHex} hairHex={hairColor}
            pantsHex={pantsColor} accessory={accessory}
            initial={name.trim()[0]?.toUpperCase() ?? "?"}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {/* Skin selector */}
            <div>
              <div style={{ fontSize: 13, color: "#7A4A22", marginBottom: 5 }}>Tom de pele</div>
              <div style={{ display: "flex", gap: 7 }}>
                {SKINS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSkin(s.id)}
                    title={s.label}
                    style={{
                      width: 30, height: 30,
                      background: s.hex,
                      border: skin === s.id ? "3px solid #3A2010" : "2px solid #7A4A22",
                      boxShadow: skin === s.id ? "0 0 0 2px #F5E2B8" : "none",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Shirt selector */}
            <div>
              <div style={{ fontSize: 13, color: "#7A4A22", marginBottom: 5 }}>Cor da camisa</div>
              <div style={{ display: "flex", gap: 7 }}>
                {SHIRTS.map((s) => (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => setShirtIndex(s.index)}
                    style={{
                      width: 30, height: 30,
                      background: s.hex,
                      border: shirtIndex === s.index ? "3px solid #3A2010" : "2px solid #7A4A22",
                      boxShadow: shirtIndex === s.index ? "0 0 0 2px #F5E2B8" : "none",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Hair color */}
            <div>
              <div style={{ fontSize: 13, color: "#7A4A22", marginBottom: 5 }}>Cor do cabelo</div>
              <div style={{ display: "flex", gap: 7 }}>
                {HAIRS.map((h) => (
                  <button
                    key={h.hex}
                    type="button"
                    onClick={() => setHairColor(h.hex)}
                    title={h.label}
                    style={{
                      width: 30, height: 30,
                      background: h.hex,
                      border: hairColor === h.hex ? "3px solid #3A2010" : "2px solid #7A4A22",
                      boxShadow: hairColor === h.hex ? "0 0 0 2px #F5E2B8" : "none",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Pants color */}
            <div>
              <div style={{ fontSize: 13, color: "#7A4A22", marginBottom: 5 }}>Cor da calça</div>
              <div style={{ display: "flex", gap: 7 }}>
                {PANTS_COLORS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setPantsColor(p.hex)}
                    title={p.label}
                    style={{
                      width: 30, height: 30,
                      background: p.hex,
                      border: pantsColor === p.hex ? "3px solid #3A2010" : "2px solid #7A4A22",
                      boxShadow: pantsColor === p.hex ? "0 0 0 2px #F5E2B8" : "none",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Accessory */}
            <div>
              <div style={{ fontSize: 13, color: "#7A4A22", marginBottom: 5 }}>Acessório</div>
              <div style={{ display: "flex", gap: 7 }}>
                {ACCESSORIES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccessory(a.id)}
                    title={a.label}
                    style={{
                      width: 40, height: 30,
                      fontSize: 16,
                      background: accessory === a.id ? "#D4B98A" : "#E9D0A0",
                      border: accessory === a.id ? "3px solid #3A2010" : "2px solid #7A4A22",
                      boxShadow: accessory === a.id ? "0 0 0 2px #F5E2B8" : "none",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Name input */}
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#3A2010", marginBottom: 5 }}>
            Seu nome
          </label>
          <input
            value={name}
            maxLength={24}
            autoFocus
            autoComplete="off"
            placeholder="Ex: Ana Lima"
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 15,
              background: "#FDF6E3",
              border: "2px solid #7A4A22",
              color: "#3A2010",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled}
          style={{
            ...woodBox,
            padding: "11px 0",
            fontSize: 15,
            border: "3px solid #5B3417",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            letterSpacing: 1,
          }}
        >
          Entrar no escritorio
        </button>
      </form>
    </div>
  );
}

function AvatarPreview({ skinHex, shirtHex, hairHex, pantsHex, accessory, initial }: {
  skinHex: string; shirtHex: string; hairHex: string;
  pantsHex: string; accessory: Accessory; initial: string;
}) {
  return (
    <div
      style={{
        width: 56,
        height: 72,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        position: "relative",
      }}
    >
      {/* Accessory (hat) */}
      {accessory === "hat" && (
        <div style={{ width: 32, height: 10, background: "#8B1a1a", borderRadius: "2px 2px 0 0", marginBottom: -4 }} />
      )}
      {/* Hair */}
      <div style={{ width: 24, height: 14, background: hairHex, borderRadius: "4px 4px 0 0" }} />
      {/* Head */}
      <div
        style={{
          width: 24, height: 18,
          background: skinHex,
          marginTop: -6,
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "rgba(0,0,0,0.5)", fontWeight: 700,
          position: "relative",
        }}
      >
        {/* Eyes */}
        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
          <div style={{ width: 4, height: 4, background: "#1a1a1a", borderRadius: "50%" }} />
          <div style={{ width: 4, height: 4, background: "#1a1a1a", borderRadius: "50%" }} />
        </div>
        {/* Glasses overlay */}
        {accessory === "glasses" && (
          <div style={{
            position: "absolute", top: 5, left: 2,
            width: 20, height: 7,
            border: "1.5px solid #1a1a1a",
            borderRadius: 2,
            display: "flex", gap: 2,
            background: "transparent",
            pointerEvents: "none",
          }} />
        )}
      </div>
      {/* Body / shirt */}
      <div
        style={{
          width: 28, height: 22,
          background: shirtHex,
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: "2px 2px 0 0",
        }}
      />
      {/* Legs / pants */}
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ width: 10, height: 12, background: pantsHex, borderRadius: "0 0 2px 2px" }} />
        <div style={{ width: 10, height: 12, background: pantsHex, borderRadius: "0 0 2px 2px" }} />
      </div>
      {/* Initial chip */}
      <div
        style={{
          position: "absolute",
          bottom: -2,
          right: -4,
          width: 18,
          height: 18,
          background: shirtHex,
          border: "2px solid #5B3417",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {initial}
      </div>
    </div>
  );
}
