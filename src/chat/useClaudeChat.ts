import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import type { ChatMessage, ClaudeStreamEvent } from "../shared/types";

export function useClaudeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);
    setIsLoading(true);
    emitTo("pet", "pet-reaction", { state: "thinking" });

    const onEvent = new Channel<ClaudeStreamEvent>();
    onEvent.onmessage = (event) => {
      switch (event.type) {
        case "textDelta":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + (event.text ?? "") }
                : m
            )
          );
          break;
        case "done":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: event.text ?? m.content, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
          emitTo("pet", "pet-reaction", { state: "happy" });
          break;
        case "error":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || `Error: ${event.error}`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsLoading(false);
          emitTo("pet", "pet-reaction", { state: "confused" });
          break;
      }
    };

    try {
      await invoke("send_to_claude", { prompt: text, onEvent });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err}`, isStreaming: false }
            : m
        )
      );
      setIsLoading(false);
      emitTo("pet", "pet-reaction", { state: "confused" });
    }
  }, []);

  return { messages, isLoading, sendMessage };
}
