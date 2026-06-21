// =============================================================================
// VANTA OS — Gemini AI Client (Section 2)
// Single lib/ai interface — the model can be swapped without touching
// business logic. The agent orchestrator (agent.ts) calls only these functions.
//
// Uses @google/generative-ai official SDK (Section 0 rule: official SDKs only).
// =============================================================================

import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from "@google/generative-ai";
import { loadEnv } from "~/lib/env.server";
import { logger } from "~/lib/logger.server";

let _client: GoogleGenerativeAI | null = null;
const _modelCache = new Map<string, GenerativeModel>();

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const apiKey = loadEnv().GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

function getModel(modelName?: string): GenerativeModel {
  const name = modelName ?? loadEnv().GEMINI_MODEL;
  const cached = _modelCache.get(name);
  if (cached) return cached;
  const model = getClient().getGenerativeModel({ model: name });
  _modelCache.set(name, model);
  return model;
}

function defaultConfig(): GenerationConfig {
  const e = loadEnv();
  return {
    temperature: e.GEMINI_TEMPERATURE,
    maxOutputTokens: e.GEMINI_MAX_TOKENS,
    topP: 0.95,
    topK: 40,
  };
}

export interface GeminiMessage {
  role: "user" | "model";
  content: string;
}

export interface GeminiToolDeclaration {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  }>;
}

export interface GeminiResponse {
  text: string;
  /** Tool call requests, if any. The agent orchestrator executes these. */
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  /** Raw finish reason for debugging. */
  finishReason: string;
  /** Usage metadata (Section 5.3 — credit consumption). */
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Generate a single response. Used for one-shot commands.
 */
export async function generateContent(
  prompt: string,
  opts?: {
    systemInstruction?: string;
    tools?: GeminiToolDeclaration[];
    modelName?: string;
    temperature?: number;
    signal?: AbortSignal;
  },
): Promise<GeminiResponse> {
  const model = getModel(opts?.modelName);
  const config: GenerationConfig = {
    ...defaultConfig(),
    ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
  };

  logger.debug("Gemini generateContent", {
    model: opts?.modelName ?? loadEnv().GEMINI_MODEL,
    promptLength: prompt.length,
    hasTools: Boolean(opts?.tools),
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: opts?.systemInstruction,
    ...(opts?.tools ? { tools: [opts.tools] } : {}),
    generationConfig: config,
  });

  return parseGeminiResponse(result.response);
}

/**
 * Generate a response in a chat thread (Section 29 — last 5-10 turns as context).
 */
export async function generateChat(
  history: GeminiMessage[],
  newMessage: string,
  opts?: {
    systemInstruction?: string;
    tools?: GeminiToolDeclaration[];
    modelName?: string;
    temperature?: number;
    signal?: AbortSignal;
  },
): Promise<GeminiResponse> {
  const model = getModel(opts?.modelName);
  const config: GenerationConfig = {
    ...defaultConfig(),
    ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
  };

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    generationConfig: config,
    systemInstruction: opts?.systemInstruction,
    ...(opts?.tools ? { tools: [opts.tools] } : {}),
  });

  const result = await chat.sendMessage(newMessage);
  return parseGeminiResponse(result.response);
}

/**
 * Stream tokens as they arrive. Useful for typewriter effect on the frontend
 * (Section 10 — progress/typewriter log while executing).
 */
export async function* streamContent(
  prompt: string,
  opts?: {
    systemInstruction?: string;
    tools?: GeminiToolDeclaration[];
    modelName?: string;
  },
): AsyncGenerator<string> {
  const model = getModel(opts?.modelName);
  const result = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: opts?.systemInstruction,
    generationConfig: defaultConfig(),
    ...(opts?.tools ? { tools: [opts.tools] } : {}),
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// --- Response parsing -------------------------------------------------------

function parseGeminiResponse(response: { text: () => string; functionCalls?: () => Array<{ name: string; args: Record<string, unknown> }>; response?: { finishReason?: string; usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number } } }): GeminiResponse {
  const text = (() => {
    try {
      return response.text();
    } catch {
      return "";
    }
  })();

  let toolCalls: GeminiResponse["toolCalls"] = [];
  try {
    const calls = response.functionCalls?.() ?? [];
    toolCalls = calls.map((c) => ({ name: c.name, args: c.args }));
  } catch {
    // functionCalls may not be available on all SDK versions
  }

  const meta = response.response;
  return {
    text,
    toolCalls,
    finishReason: meta?.finishReason ?? "STOP",
    usage: meta?.usageMetadata
      ? {
          promptTokenCount: meta.usageMetadata.promptTokenCount,
          candidatesTokenCount: meta.usageMetadata.candidatesTokenCount,
          totalTokenCount: meta.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}

/**
 * Health check — verifies the Gemini API key works.
 */
export async function pingGemini(): Promise<boolean> {
  try {
    const r = await generateContent("Reply with the single word OK.", {
      temperature: 0,
    });
    return r.text.toLowerCase().includes("ok");
  } catch (err) {
    logger.error("Gemini ping failed", { error: String(err) });
    return false;
  }
}
