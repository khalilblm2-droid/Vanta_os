// Phase E: Memory — long-term semantic memory with outcome tracking
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecret } from "~/lib/security/secrets-vault";

export type MemoryType = "PREFERENCE" | "DECISION" | "OUTCOME" | "PATTERN" | "FACT" | "LESSON";

export interface MemoryEntry {
  id: string;
  memoryType: MemoryType;
  content: string;
  summary?: string;
  importance: number;
  confidence: number;
  outcomePositive?: boolean;
}

let _embedModel: any = null;
async function getEmbedModel() {
  if (_embedModel) return _embedModel;
  const client = new GoogleGenerativeAI(getSecret("GEMINI_API_KEY"));
  _embedModel = client.getGenerativeModel({ model: "text-embedding-004" });
  return _embedModel;
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const model = await getEmbedModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    return [];
  }
}

export async function storeMemory(shopDomain: string, entry: Omit<MemoryEntry, "id"> & { sourceType?: string; sourceId?: string }): Promise<string> {
  const embedding = await getEmbedding(entry.content);
  const memory = await prisma.memory.create({
    data: {
      shopDomain, memoryType: entry.memoryType, content: entry.content, summary: entry.summary,
      embedding, importance: entry.importance, confidence: entry.confidence,
      sourceType: entry.sourceType, sourceId: entry.sourceId, outcomePositive: entry.outcomePositive,
    },
  });
  logger.debug("Memory stored", { shopDomain, type: entry.memoryType, id: memory.id });
  return memory.id;
}

export async function searchMemory(shopDomain: string, query: string, limit = 5): Promise<MemoryEntry[]> {
  const queryEmbedding = await getEmbedding(query);
  const candidates = await prisma.memory.findMany({
    where: { shopDomain },
    orderBy: { importance: "desc" },
    take: 100,
  });

  if (candidates.length === 0) return [];

  const scored = candidates.map((m) => {
    const emb = m.embedding as number[];
    let score = 0;
    if (queryEmbedding.length > 0 && emb.length > 0 && queryEmbedding.length === emb.length) {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < emb.length; i++) {
        dot += queryEmbedding[i] * emb[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += emb[i] * emb[i];
      }
      score = (dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1));
    }
    return { id: m.id, memoryType: m.memoryType as MemoryType, content: m.content, summary: m.summary ?? undefined, importance: m.importance, confidence: m.confidence, outcomePositive: m.outcomePositive ?? undefined, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Update access counts
  if (top.length > 0) {
    await prisma.memory.updateMany({ where: { id: { in: top.map((m) => m.id) } }, data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() } });
  }

  return top;
}

export async function buildMemoryContext(shopDomain: string, query: string, limit = 5): Promise<string> {
  const memories = await searchMemory(shopDomain, query, limit);
  if (memories.length === 0) return "No relevant memories yet.";
  const lines = memories.map((m, i) => `${i + 1}. [${m.memoryType}] ${m.summary ?? m.content.slice(0, 200)}`);
  return `Long-term memory:\n${lines.join("\n")}`;
}

export async function recordOutcome(shopDomain: string, memoryId: string, positive: boolean, reasoning: string): Promise<void> {
  await prisma.memory.update({ where: { id: memoryId }, data: { outcomePositive: positive } });
  await storeMemory(shopDomain, {
    memoryType: "OUTCOME",
    content: `Memory ${memoryId} outcome: ${positive ? "POSITIVE" : "NEGATIVE"}. Reasoning: ${reasoning}`,
    summary: `Outcome: ${positive ? "success" : "failure"}`,
    importance: positive ? 0.7 : 0.8,
    confidence: 0.9,
    sourceType: "FEEDBACK",
    outcomePositive: positive,
  });
}

export async function consolidateMemories(shopDomain?: string): Promise<{ decayed: number; deleted: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const decayed = await prisma.memory.updateMany({
    where: { ...(shopDomain ? { shopDomain } : {}), OR: [{ lastAccessedAt: { lt: thirtyDaysAgo } }, { lastAccessedAt: null, createdAt: { lt: thirtyDaysAgo } }], importance: { gt: 0.1 } },
    data: { importance: { multiply: 0.9 } },
  });

  const deleted = await prisma.memory.deleteMany({
    where: { ...(shopDomain ? { shopDomain } : {}), importance: { lt: 0.1 }, OR: [{ lastAccessedAt: { lt: ninetyDaysAgo } }, { lastAccessedAt: null, createdAt: { lt: ninetyDaysAgo } }] },
  });

  logger.info("Memory consolidated", { shopDomain: shopDomain ?? "all", decayed: decayed.count, deleted: deleted.count });
  return { decayed: decayed.count, deleted: deleted.count };
}
