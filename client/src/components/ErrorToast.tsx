import { useEffect } from "react";
import { useConversationStore } from "../stores/conversationStore";

export function ErrorToast() {
  const error = useConversationStore((s) => s.error);
  const setError = useConversationStore((s) => s.setError);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 52,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#7A2020",
        border: "2px solid #c04040",
        borderRadius: 2,
        padding: "10px 20px",
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: 13,
        color: "#F2E2B8",
        zIndex: 800,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        maxWidth: 400,
        textAlign: "center",
      }}
    >
      {error}
    </div>
  );
}
