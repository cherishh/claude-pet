import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useAIChat } from "./useAIChat";

export function ChatWindow() {
  const { messages, isLoading, sendMessage, provider } = useAIChat();
  const [aiAvailable, setAiAvailable] = useState(true);

  const handleClose = useCallback(() => {
    getCurrentWindow().hide();
  }, []);

  useEffect(() => {
    invoke("check_ai_available", {
      binary: provider.binary,
      checkCommand: provider.checkCommand,
    }).then((ok) => {
      setAiAvailable(ok as boolean);
    });
  }, [provider]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ ...styles.headerDot, background: aiAvailable ? "#4ade80" : "#f87171" }} />
        <span style={styles.headerTitle}>Chat with {provider.displayName}</span>
        <button onClick={handleClose} style={styles.closeBtn}>×</button>
      </div>
      {!aiAvailable && (
        <div style={styles.banner}>
          <strong>{provider.binary}</strong> CLI not found in PATH.{" "}
          <a
            href={provider.installUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#60a5fa" }}
          >
            Install {provider.displayName}
          </a>
        </div>
      )}
      <ChatMessages messages={messages} assistantName={provider.displayName} />
      <ChatInput onSend={sendMessage} disabled={isLoading || !aiAvailable} assistantName={provider.displayName} />
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
