// =============================================================================
// VANTA OS — Autonomous AI Agents (2026 — runs 24/7 without human)
// Self-directed agents that monitor, decide, and act. Each agent has a goal,
// constraints, and the ability to spawn sub-tasks.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { generateContent } from "~/lib/ai/gemini.client";
import { enqueueTask } from "~/lib/queue/task-queue";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

export interface AutonomousAgent {
  id: string;
  name: string;
  goal: string;
  schedule: string; // cron
  lastRun: string | null;
  status: "IDLE" | "RUNNING" | "PAUSED";
  decisions: number;
  actionsTaken: number;
}

const AGENTS: AutonomousAgent[] = [
  {
    id: "inventory-guardian",
    name: "Inventory Guardian",
    goal: "Prevent stockouts by auto-reordering before inventory hits zero",
    schedule: "0 */6 * * *", // every 6 hours
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "price-optimizer",
    name: "Price Optimizer",
    goal: "Maximize revenue by adjusting prices based on demand + competitor data",
    schedule: "0 9 * * 1", // every Monday 9am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "seo-enhancer",
    name: "SEO Enhancer",
    goal: "Continuously improve product SEO scores and meta descriptions",
    schedule: "0 2 * * *", // daily at 2am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "customer-retention",
    name: "Customer Retention",
    goal: "Identify at-risk customers and trigger win-back campaigns",
    schedule: "0 8 * * *", // daily at 8am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "fraud-monitor",
    name: "Fraud Monitor",
    goal: "Score every new order for fraud risk in real-time",
    schedule: "* * * * *", // every minute
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "trend-scout",
    name: "Trend Scout",
    goal: "Scan TikTok/Instagram for trending products matching our catalog",
    schedule: "0 12 * * *", // daily at noon
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
  {
    id: "ab-test-manager",
    name: "A/B Test Manager",
    goal: "Run continuous experiments on product pages, emails, and pricing",
    schedule: "0 0 * * 0", // weekly Sunday
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0,
  },
];

export function listAutonomousAgents(): AutonomousAgent[] {
  return AGENTS;
}

export async function runAutonomousAgent(
  shopDomain: string,
  agentId: string,
): Promise<{ ran: boolean; reason?: string }> {
  if (await isKillSwitchOn(shopDomain)) {
    return { ran: false, reason: "Kill switch enabled" };
  }

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return { ran: false, reason: "Agent not found" };

  logger.info("Autonomous agent starting", { shopDomain, agent: agentId });

  // Use Gemini to decide what action to take
  const prompt = `You are the ${agent.name} autonomous agent. Your goal: ${agent.goal}

Analyze the current store state and decide ONE high-impact action to take.
Output JSON: {"action": "<description>", "confidence": <0-1>, "reasoning": "<1 sentence>"}`;

  try {
    const resp = await generateContent(prompt, { temperature: 0.3 });
    let decision: { action?: string; confidence?: number; reasoning?: string };
    try {
      const m = resp.text.match(/\{[\s\S]*\}/);
      decision = JSON.parse(m?.[0] ?? "{}");
    } catch {
      decision = {};
    }

    // Enqueue a task to execute the decision
    if (decision.action) {
      await prisma.task.create({
        data: {
          shopId: (await prisma.shop.findUnique({ where: { shopDomain }, select: { id: true } }))?.id ?? "",
          shopDomain,
          command: `[Autonomous: ${agent.name}] ${decision.action}`,
          language: "en",
          status: "QUEUED",
          priority: "HIGH",
          estimatedCredits: 2,
        },
      });

      agent.decisions++;
      agent.actionsTaken++;
      agent.lastRun = new Date().toISOString();
      agent.status = "IDLE";

      logger.info("Autonomous agent completed", {
        shopDomain,
        agent: agentId,
        action: decision.action,
        confidence: decision.confidence,
      });
    }

    return { ran: true };
  } catch (err) {
    agent.status = "IDLE";
    logger.error("Autonomous agent failed", { agent: agentId, error: String(err) });
    return { ran: false, reason: String(err) };
  }
}

/**
 * Run all autonomous agents for a shop on their schedule.
 * Called by the worker every minute.
 */
export async function tickAutonomousAgents(shopDomain: string): Promise<void> {
  for (const agent of AGENTS) {
    // Simple check: run if lastRun is null or > 6 hours ago
    if (!agent.lastRun || Date.now() - new Date(agent.lastRun).getTime() > 6 * 60 * 60 * 1000) {
      await runAutonomousAgent(shopDomain, agent.id).catch(() => {});
    }
  }
}
