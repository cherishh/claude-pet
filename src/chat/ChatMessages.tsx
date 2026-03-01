import { useRef, useEffect } from "react";
import type { ChatMessage } from "../shared/types";

interface Props {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🐾</div>
        <div>Click to start chatting!</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            ...styles.message,
            ...(msg.role === "user" ? styles.userMsg : styles.assistantMsg),
          }}
        >
          <div style={styles.role}>
            {msg.role === "user" ? "You" : "Claude"}
          </div>
          <div style={styles.content}>
            {msg.content}
            {msg.isStreaming && <span style={styles.cursor}>▌</span>}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    color: "#666",
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
  },
  message: {
    padding: "10px 14px",
    borderRadius: 10,
    maxWidth: "85%",
    lineHeight: 1.5,
  },
  userMsg: {
    background: "#0f3460",
    alignSelf: "flex-end" as const,
  },
  assistantMsg: {
    background: "#16213e",
    border: "1px solid #0f3460",
    alignSelf: "flex-start" as const,
  },
  role: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
    fontWeight: 600,
  },
  content: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
  cursor: {
    animation: "blink 1s step-end infinite",
    color: "#4ade80",
  },
} as const;
