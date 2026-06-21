// =============================================================================
// VANTA OS — Gemini Client Tests (Section 41, Section 2)
// Verifies the single lib/ai interface abstractions without hitting the network.
// =============================================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const fakeResponse = {
    text: () => "OK",
    functionCalls: () => [],
    response: { finishReason: "STOP", usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, totalTokenCount: 7 } },
  };
  return {
    GoogleGenerativeAI: class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_apiKey: string) {}
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({ response: fakeResponse }),
          startChat: () => ({
            sendMessage: vi.fn().mockResolvedValue({ response: fakeResponse }),
          }),
          generateContentStream: async function* () {
            yield { text: () => "OK" };
          },
        };
      }
    },
  };
});

import { generateContent, generateChat, streamContent, pingGemini } from "~/lib/ai/gemini.client";

describe("gemini.client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateContent returns text + toolCalls + usage", async () => {
    const r = await generateContent("Say OK");
    expect(r.text).toBe("OK");
    expect(r.toolCalls).toEqual([]);
    expect(r.finishReason).toBe("STOP");
    expect(r.usage?.totalTokenCount).toBe(7);
  });

  it("generateChat returns the same shape with history context", async () => {
    const r = await generateChat(
      [
        { role: "user", content: "Hi" },
        { role: "model", content: "Hello" },
      ],
      "How are you?",
    );
    expect(r.text).toBe("OK");
  });

  it("streamContent yields chunks", async () => {
    const chunks: string[] = [];
    for await (const c of streamContent("Say OK")) {
      chunks.push(c);
    }
    expect(chunks).toEqual(["OK"]);
  });

  it("pingGemini returns true when API responds", async () => {
    expect(await pingGemini()).toBe(true);
  });
});
