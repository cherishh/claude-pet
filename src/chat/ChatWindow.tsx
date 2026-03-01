import { useState } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "../shared/types";

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Placeholder: will be replaced by Claude integration in Phase 4
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Claude integration coming in Phase 4...",
    };
    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerDot} />
        <span style={styles.headerTitle}>Chat with Claude</span>
      </div>
      <ChatMessages messages={messages} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
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
    background: "#4ade80",
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 13,
  },
} as const;
