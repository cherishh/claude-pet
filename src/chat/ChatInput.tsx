import { useState, useCallback } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div style={styles.container}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Thinking..." : "Ask Claude anything..."}
        disabled={disabled}
        style={styles.textarea}
        rows={2}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        style={{
          ...styles.button,
          opacity: disabled || !text.trim() ? 0.4 : 1,
        }}
      >
        ↑
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #0f3460",
    background: "#16213e",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#1a1a2e",
    border: "1px solid #0f3460",
    borderRadius: 8,
    color: "#eee",
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "none" as const,
    outline: "none",
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#4a9eff",
    color: "#fff",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
} as const;
