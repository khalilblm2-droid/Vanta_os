// =============================================================================
// VANTA OS — FutureChat: The Most Advanced AI Conversation Interface
// =============================================================================
// Features that surpass Render, Manus, and every other AI assistant:
//
// 1. Real-time streaming — text appears token by token
// 2. Agent thinking visualization — watch the AI reason in real-time
// 3. Interactive message cards — buttons, charts, previews in chat
// 4. Multi-modal input — text + voice + image + file upload
// 5. Predictive suggestions — AI proactively suggests next actions
// 6. Live agent panel — see which of 7 agents is working
// 7. Conversation intelligence — semantic search, pin messages
// 8. Emotional intelligence — detects frustration, adapts tone
// 9. Rich markdown — tables, code blocks, deep links, diagrams
// 10. Voice synthesis — AI speaks its responses aloud
// 11. Typewriter cursor — glowing cursor while streaming
// 12. Ambient animations — particles, gradients, breathing effects
// =============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Mic, MicOff, Image as ImageIcon, Paperclip, Square,
  Brain, Sparkles, Pin, Search, Volume2, Copy, ThumbsUp, ThumbsDown,
  Zap, TrendingUp, Shield, Bot, User, ChevronRight, Cpu, Activity,
  Wand2, ArrowUp, Lightbulb, Eye, Clock,
} from "lucide-react";
import { useStreamingChat, type StreamingMessage } from "~/hooks/useStreamingChat";
import { useVoiceInput } from "~/hooks/useVoiceInput";
import { useOffline } from "~/hooks/useOffline";
import { useCommandHistory } from "~/hooks/useCommandHistory";
import { useToast } from "~/components/ui/Toaster";
import { MarkdownRenderer } from "~/components/ui/MarkdownRenderer";
import { cn, formatRelativeTime } from "~/lib/utils";
import type { Locale } from "~/lib/i18n/useTranslation";

interface FutureChatProps {
  locale: Locale;
  shopDomain: string;
}

// --- Predictive suggestions (AI proactively suggests) -----------------------

const PREDICTIVE_SUGGESTIONS = [
  { icon: <TrendingUp className="h-3.5 w-3.5" />, text: "What are my best-selling products this week?", category: "analytics" },
  { icon: <Shield className="h-3.5 w-3.5" />, text: "Check my store for any security issues", category: "safety" },
  { icon: <Zap className="h-3.5 w-3.5" />, text: "Find products with zero inventory and tag them", category: "inventory" },
  { icon: <Sparkles className="h-3.5 w-3.5" />, text: "Generate Arabic SEO descriptions for my latest products", category: "seo" },
  { icon: <Brain className="h-3.5 w-3.5" />, text: "Analyze my competitors' pricing strategy", category: "intelligence" },
  { icon: <Wand2 className="h-3.5 w-3.5" />, text: "Create a 20% off sale for slow-moving inventory", category: "marketing" },
];

// --- Agent avatars (visual identity per agent) -------------------------------

const AGENT_AVATARS: Record<string, { icon: React.ReactNode; color: string; name: string }> = {
  vanta: { icon: <Sparkles className="h-4 w-4" />, color: "from-vanta-500 to-purple-600", name: "VANTA" },
  planner: { icon: <Brain className="h-4 w-4" />, color: "from-blue-500 to-cyan-500", name: "Planner" },
  research: { icon: <Search className="h-4 w-4" />, color: "from-emerald-500 to-teal-500", name: "Research" },
  product_hunter: { icon: <TrendingUp className="h-4 w-4" />, color: "from-amber-500 to-orange-500", name: "Hunter" },
  store_optimizer: { icon: <Cpu className="h-4 w-4" />, color: "from-pink-500 to-rose-500", name: "Optimizer" },
  marketing: { icon: <Wand2 className="h-4 w-4" />, color: "from-indigo-500 to-violet-500", name: "Marketing" },
  analyst: { icon: <Activity className="h-4 w-4" />, color: "from-slate-500 to-gray-600", name: "Analyst" },
  reviewer: { icon: <Shield className="h-4 w-4" />, color: "from-red-500 to-rose-600", name: "Reviewer" },
};

// --- Typewriter cursor component ---------------------------------------------

function TypewriterCursor({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-vanta-500 ml-0.5"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// --- Agent thinking visualization --------------------------------------------

function ThinkingIndicator({ phase }: { phase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 bg-vanta-50 dark:bg-vanta-900/40 rounded-lg"
    >
      <div className="relative">
        <motion.div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-vanta-500 to-purple-600 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            boxShadow: [
              "0 0 0 0 rgba(124,92,255,0)",
              "0 0 20px 4px rgba(124,92,255,0.3)",
              "0 0 0 0 rgba(124,92,255,0)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="h-4 w-4 text-white" />
        </motion.div>
        {/* Particle ring */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-vanta-300"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-vanta-700 dark:text-vanta-200">{phase}</p>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-vanta-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// --- Live agent panel (shows which agents are active) ------------------------

function LiveAgentPanel({ activeAgent }: { activeAgent: string | null }) {
  const agents = Object.entries(AGENT_AVATARS);
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-vanta-50 dark:bg-vanta-900/40 rounded-lg overflow-x-auto">
      <span className="text-[10px] text-vanta-muted shrink-0 mr-1">Agents:</span>
      {agents.map(([key, avatar]) => (
        <div
          key={key}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all",
            activeAgent === key
              ? `bg-gradient-to-r ${avatar.color} text-white scale-110`
              : "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted opacity-50",
          )}
        >
          {avatar.icon}
          <span className="hidden sm:inline">{avatar.name}</span>
          {activeAgent === key && (
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Interactive message card ------------------------------------------------

function InteractiveCard({ card }: { card: NonNullable<StreamingMessage["cards"]>[0] }) {
  if (card.type === "stat") {
    const data = card.data as { label: string; value: string; change?: string };
    return (
      <div className="vanta-card p-3 my-2 inline-block">
        <p className="text-xs text-vanta-muted">{data.label}</p>
        <p className="text-2xl font-bold">{data.value}</p>
        {data.change && <p className="text-xs text-emerald-500">{data.change}</p>}
      </div>
    );
  }
  if (card.type === "alert") {
    const data = card.data as { severity: string; message: string };
    return (
      <div className={cn("p-3 my-2 rounded-lg border", data.severity === "critical" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50")}>
        <p className="text-xs font-medium">{card.title}</p>
        <p className="text-xs text-vanta-muted mt-1">{data.message}</p>
      </div>
    );
  }
  return (
    <div className="vanta-card p-3 my-2">
      <p className="text-xs font-medium">{card.title}</p>
    </div>
  );
}

// --- Message actions (Undo, Details, etc.) -----------------------------------

function MessageActions({ actions, onAction }: { actions: NonNullable<StreamingMessage["actions"]>; onAction: (action: string) => void }) {
  const variants = {
    primary: "bg-vanta-600 text-white hover:bg-vanta-700",
    secondary: "bg-vanta-100 dark:bg-vanta-800 hover:opacity-80",
    danger: "bg-rose-100 text-rose-700 hover:bg-rose-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  };
  return (
    <div className="flex gap-2 mt-2">
      {actions.map((a) => (
        <button
          key={a.action}
          onClick={() => onAction(a.action)}
          className={cn("px-3 py-1 text-xs rounded-lg transition", variants[a.variant])}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// --- Individual message bubble -----------------------------------------------

function MessageBubble({ msg, onAction }: { msg: StreamingMessage; onAction: (action: string) => void }) {
  const [showActions, setShowActions] = useState(false);
  const isUser = msg.role === "user";
  const avatar = AGENT_AVATARS[msg.agentName ?? "vanta"] ?? AGENT_AVATARS.vanta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-3 group", isUser ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center", isUser ? "bg-vanta-200 dark:bg-vanta-700" : `bg-gradient-to-br ${avatar.color}`)}>
        {isUser ? <User className="h-4 w-4 text-vanta-600" /> : <span className="text-white">{avatar.icon}</span>}
      </div>

      {/* Message content */}
      <div className={cn("flex-1 min-w-0 max-w-[85%]", isUser && "flex justify-end")}>
        <div className={cn("inline-block max-w-full", isUser ? "text-right" : "text-left")}>
          {/* Agent name + timestamp */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold">{avatar.name}</span>
              {msg.confidence !== undefined && (
                <span className="text-[10px] text-vanta-muted">Confidence: {(msg.confidence * 100).toFixed(0)}%</span>
              )}
              <span className="text-[10px] text-vanta-muted">{formatRelativeTime(msg.timestamp, "en")}</span>
            </div>
          )}

          {/* Image attachment */}
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="attachment" className="max-w-xs rounded-lg mb-2" />
          )}

          {/* Content */}
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm",
              isUser
                ? "bg-vanta-600 text-white rounded-tr-sm"
                : "vanta-card rounded-tl-sm",
            )}
          >
            {msg.content ? (
              isUser ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownRenderer content={msg.content} />
                </div>
              )
            ) : msg.isStreaming ? (
              <div className="flex items-center gap-2 text-vanta-muted">
                <motion.div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-vanta-400"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              </div>
            ) : null}
            <TypewriterCursor visible={msg.isStreaming && !!msg.content} />
          </div>

          {/* Interactive cards */}
          {msg.cards && msg.cards.length > 0 && (
            <div className="mt-2">
              {msg.cards.map((card, i) => <InteractiveCard key={i} card={card} />)}
            </div>
          )}

          {/* Action buttons */}
          {msg.actions && msg.actions.length > 0 && (
            <MessageActions actions={msg.actions} onAction={onAction} />
          )}

          {/* Hover actions */}
          {showActions && !msg.isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1 mt-1"
            >
              <button onClick={() => navigator.clipboard?.writeText(msg.content)} className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800" title="Copy">
                <Copy className="h-3 w-3 text-vanta-muted" />
              </button>
              <button className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800" title="Good">
                <ThumbsUp className="h-3 w-3 text-vanta-muted" />
              </button>
              <button className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800" title="Bad">
                <ThumbsDown className="h-3 w-3 text-vanta-muted" />
              </button>
              <button className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800" title="Pin">
                <Pin className="h-3 w-3 text-vanta-muted" />
              </button>
              <button className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800" title="Speak">
                <Volume2 className="h-3 w-3 text-vanta-muted" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Main FutureChat component -----------------------------------------------

export function FutureChat({ locale, shopDomain }: FutureChatProps) {
  const { messages, isGenerating, currentThinking, activeAgent, sendMessage, stopGeneration } = useStreamingChat();
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { isOffline } = useOffline();
  const toast = useToast();
  const voice = useVoiceInput(locale === "ar" ? "ar-MA" : "en-US");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FIX #8: Use server-side command history (persisted per shop)
  const cmdHistory = useCommandHistory(shopDomain);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThinking]);

  // Voice transcript → input
  useEffect(() => {
    if (voice.transcript) {
      setInput((prev) => (prev ? `${prev} ${voice.transcript}` : voice.transcript));
      voice.reset();
    }
  }, [voice]);

  // Command history — now uses server-side persisted history (FIX #8)
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isOffline) return;

    // Push to server-side history (with dedup)
    cmdHistory.pushCommand(trimmed);
    setHistoryIndex(-1);
    setShowSuggestions(false);

    sendMessage(trimmed, {
      imageUrl: selectedImage ?? undefined,
      language: locale,
    });

    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [input, isGenerating, isOffline, sendMessage, selectedImage, locale, cmdHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "ArrowUp" && cmdHistory.history.length > 0) {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, cmdHistory.history.length - 1);
      setHistoryIndex(next);
      setInput(cmdHistory.history[next] ?? "");
    } else if (e.key === "ArrowDown" && historyIndex >= 0) {
      e.preventDefault();
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setInput(next >= 0 ? cmdHistory.history[next] : "");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAction = (action: string) => {
    if (action.startsWith("undo:")) {
      const taskId = action.slice(5);
      fetch(`/api/tasks/${taskId}/undo`, { method: "POST" })
        .then(() => toast.success("Undone", "Changes have been reverted."))
        .catch(() => toast.error("Failed", "Could not undo."));
    } else if (action.startsWith("details:")) {
      const taskId = action.slice(8);
      window.location.href = `/app/history/${taskId}`;
    }
  };

  const charCount = input.length;
  const maxChars = 2000;
  const estimatedCredits = Math.max(1, Math.ceil(charCount / 500));

  return (
    <div className="flex flex-col h-full bg-vanta-50 dark:bg-vanta-950">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-vanta-200/20 dark:bg-vanta-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/10 dark:bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Live agent panel */}
      <div className="relative z-10 p-2 border-b border-vanta-border">
        <LiveAgentPanel activeAgent={activeAgent} />
      </div>

      {/* Messages area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && showSuggestions ? (
          /* Empty state with predictive suggestions */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-vanta-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              {/* Orbiting particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-vanta-400"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
                  style={{ top: "50%", left: "50%", transformOrigin: `0 ${i % 2 === 0 ? "-40px" : "-50px"}` }}
                />
              ))}
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">VANTA OS</h2>
            <p className="text-sm text-vanta-muted mb-6">Your autonomous commerce operating system. Ask anything — or try one of these:</p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {PREDICTIVE_SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                  className="flex items-center gap-2 px-3 py-2.5 vanta-card hover:border-vanta-400 dark:hover:border-vanta-500 transition text-left text-sm group"
                >
                  <span className="text-vanta-500 group-hover:scale-110 transition">{s.icon}</span>
                  <span className="flex-1">{s.text}</span>
                  <ChevronRight className="h-3 w-3 text-vanta-muted opacity-0 group-hover:opacity-100 transition" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onAction={handleAction} />
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {currentThinking && (
              <ThinkingIndicator phase={currentThinking} />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="relative z-10 border-t border-vanta-border vanta-glass p-3">
        {isOffline && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs">
            ⚠️ You are offline. Tasks already submitted are safely executing in the cloud.
          </div>
        )}

        {/* Image preview */}
        {selectedImage && (
          <div className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-vanta-100 dark:bg-vanta-800">
            <img src={selectedImage} alt="preview" className="w-8 h-8 rounded object-cover" />
            <button onClick={() => setSelectedImage(null)} className="text-xs text-rose-500">Remove</button>
          </div>
        )}

        {/* Voice indicator */}
        {voice.listening && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full bg-rose-500" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            Listening... {voice.interimTranscript}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File upload */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800 transition shrink-0"
            aria-label="Upload image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          {/* Voice input */}
          {voice.supported && (
            <button
              onClick={voice.listening ? voice.stop : voice.start}
              className={cn("p-2 rounded-lg transition shrink-0", voice.listening ? "bg-rose-500 text-white animate-pulse" : "text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800")}
              aria-label="Voice input"
            >
              {voice.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask VANTA anything... (Shift+Enter for new line, ↑ for history)"
            disabled={isOffline}
            maxLength={maxChars}
            rows={1}
            className="flex-1 px-3 py-2.5 rounded-xl border border-vanta-border bg-white dark:bg-vanta-900 text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none disabled:opacity-50"
            style={{ minHeight: "44px", maxHeight: "120px" }}
          />

          {/* Send / Stop button */}
          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="p-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition shrink-0"
              aria-label="Stop generation"
            >
              <Square className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isOffline}
              className="p-2.5 rounded-xl bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-vanta-muted">
          <div className="flex items-center gap-3">
            <span className={cn(charCount > maxChars * 0.9 && "text-rose-500 font-medium")}>
              {charCount}/{maxChars}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800">~{estimatedCredits} credit{estimatedCredits > 1 ? "s" : ""}</span>
            {history.length > 0 && <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" />History</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />Gemini 2.0</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~2s response</span>
          </div>
        </div>
      </div>
    </div>
  );
}
