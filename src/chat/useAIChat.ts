import { useState, useCallback, useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import type { ChatMessage, AIStreamEvent, AIProviderConfig } from "../shared/types";

const DEFAULT_PROVIDER: AIProviderConfig = {
  name: "Claude",
  displayName: "Claude",
  binary: "claude",
  envRemove: ["CLAUDECODE"],
  args: ["--print", "--output-format", "stream-json"],
  streamFormat: "claude-stream-json",
  checkCommand: "which",
  installUrl: "https://docs.anthropic.com/en/docs/claude-code",
};

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AIProviderConfig>(DEFAULT_PROVIDER);

  useEffect(() => {
    fetch("/ai-provider.json")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((config: AIProviderConfig) => setProvider(config))
      .catch(() => {
        // Fall back to default provider
      });
  }, []);

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

    const onEvent = new Channel<AIStreamEvent>();
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
      await invoke("send_message", {
        prompt: text,
        binary: provider.binary,
        args: provider.args,
        envRemove: provider.envRemove,
        onEvent,
      });
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
  }, [provider]);

  return { messages, isLoading, sendMessage, provider };
}
