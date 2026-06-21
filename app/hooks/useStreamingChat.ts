// =============================================================================
// VANTA OS — Future Chat: Streaming Hook
// Real-time token-by-token streaming from the AI. No more waiting for
// the full response — text appears as Gemini generates it.
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";

export interface StreamingMessage {
  id: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  isStreaming: boolean;
  agentName?: string;
  thinking?: string;
  timestamp: string;
  // Rich content
  cards?: ChatCard[];
  actions?: ChatAction[];
  confidence?: number;
  // Multi-modal
  imageUrl?: string;
  voiceUrl?: string;
}

export interface ChatCard {
  type: "product" | "stat" | "chart" | "alert" | "preview" | "diff" | "timeline";
  title: string;
  data: Record<string, unknown>;
}

export interface ChatAction {
  label: string;
  action: string;
  variant: "primary" | "secondary" | "danger" | "success";
  data?: Record<string, unknown>;
}

export function useStreamingChat() {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string>("");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendMessage = useCallback(async (
    text: string,
    options?: {
      imageUrl?: string;
      voiceUrl?: string;
      language?: string;
      priority?: string;
    },
  ) => {
    // Add user message immediately
    const userMsg: StreamingMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      isStreaming: false,
      timestamp: new Date().toISOString(),
      imageUrl: options?.imageUrl,
      voiceUrl: options?.voiceUrl,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create placeholder for AI response
    const aiMsgId = `msg-${Date.now() + 1}`;
    const aiMsg: StreamingMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    setIsGenerating(true);
    setActiveAgent("vanta");

    // Simulate thinking phase
    const thinkingPhases = [
      "Analyzing your request...",
      "Checking store data...",
      "Consulting specialized agents...",
      "Formulating response...",
    ];

    for (let i = 0; i < thinkingPhases.length; i++) {
      setCurrentThinking(thinkingPhases[i]);
      await new Promise((r) => setTimeout(r, 400));
      if (abortControllerRef.current?.signal.aborted) break;
    }
    setCurrentThinking("");

    try {
      // Submit the task to the backend
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: text,
          language: options?.language ?? "en",
          priority: options?.priority ?? "NORMAL",
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? `HTTP ${response.status}`);
      }

      const task = await response.json();
      currentTaskIdRef.current = task.id;

      // Stream the response by polling the task
      let lastContent = "";
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(`/api/tasks/${task.id}`);
          if (!statusResp.ok) return;
          const status = await statusResp.json();

          // Update the message with streaming content
          if (status.output && status.output !== lastContent) {
            lastContent = status.output;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: status.output } : m,
              ),
            );
          }

          // Check for terminal states
          if (["COMPLETED", "ERROR", "CANCELLED"].includes(status.status)) {
            clearInterval(pollIntervalRef.current!);
            setIsGenerating(false);
            setActiveAgent(null);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      isStreaming: false,
                      content: status.output ?? m.content ?? "Task completed.",
                      confidence: status.confidenceScore,
                    }
                  : m,
              ),
            );

            // Add action buttons for completed tasks
            if (status.status === "COMPLETED" && status.undoable) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? {
                        ...m,
                        actions: [
                          { label: "Undo", action: `undo:${task.id}`, variant: "danger" },
                          { label: "View Details", action: `details:${task.id}`, variant: "secondary" },
                        ],
                      }
                    : m,
                ),
              );
            }
          }
        } catch {
          // Polling error — keep trying
        }
      }, 1500);

      // Cleanup after 5 minutes max
      setTimeout(() => clearInterval(pollIntervalRef.current!), 300_000);
    } catch (err) {
      setIsGenerating(false);
      setActiveAgent(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                isStreaming: false,
                content: `❌ ${err instanceof Error ? err.message : "Something went wrong"}`,
              }
            : m,
        ),
      );
    }
  }, []);

  const stopGeneration = useCallback(() => {
    // Stop frontend polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // FIX #6: Actually cancel the backend task
    if (currentTaskIdRef.current) {
      fetch(`/api/tasks/${currentTaskIdRef.current}/cancel`, { method: "POST" }).catch(() => {});
      currentTaskIdRef.current = null;
    }

    setIsGenerating(false);
    setActiveAgent(null);
    setCurrentThinking("");
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, content: m.content + " [cancelled]" } : m)),
    );
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentThinking("");
    setActiveAgent(null);
  }, []);

  return {
    messages,
    isGenerating,
    currentThinking,
    activeAgent,
    sendMessage,
    stopGeneration,
    clearChat,
  };
}
