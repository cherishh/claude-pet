import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useClaudeChat } from "./useClaudeChat";

export function ChatWindow() {
  const { messages, isLoading, sendMessage } = useClaudeChat();
  const [claudeAvailable, setClaudeAvailable] = useState(true);

  const handleClose = useCallback(() => {
    getCurrentWindow().hide();
  }, []);

  useEffect(() => {
    invoke("check_claude_available").then((ok) => {
      setClaudeAvailable(ok as boolean);
    });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ ...styles.headerDot, background: claudeAvailable ? "#4ade80" : "#f87171" }} />
        <span style={styles.headerTitle}>Chat with Claude</span>
        <button onClick={handleClose} style={styles.closeBtn}>×</button>
      </div>
      {!claudeAvailable && (
        <div style={styles.banner}>
          <strong>claude</strong> CLI not found in PATH.{" "}
          <a
            href="https://docs.anthropic.com/en/docs/claude-code"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#60a5fa" }}
          >
            Install Claude Code
          </a>
        </div>
      )}
      <ChatMessages messages={messages} />
      <ChatInput onSend={sendMessage} disabled={isLoading || !claudeAvailable} />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    background: "#1a1a2e",
    color: "#eee",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#16213e",
    borderBottom: "1px solid #0f3460",
    WebkitAppRegion: "drag" as unknown as string,
    cursor: "grab",
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 13,
    flex: 1,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 20,
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
    WebkitAppRegion: "no-drag" as unknown as string,
  },
  banner: {
    padding: "10px 16px",
    background: "#2d1b1b",
    borderBottom: "1px solid #5c2424",
    fontSize: 13,
    color: "#f87171",
  },
} as const;
