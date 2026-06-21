// Phase E: Decision Tracker — records every autonomous decision for audit + learning
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

export interface DecisionInput {
  goalId?: string;
  planId?: string;
  stepId?: string;
  taskId?: string;
  decisionType: "EXECUTE" | "SKIP" | "RETRY" | "REVISE" | "ESCALATE" | "ROLLBACK";
  reasoning: string;
  alternatives?: string[];
  confidence: number;
  requiresApproval?: boolean;
}

export async function recordDecision(shopDomain: string, input: DecisionInput): Promise<string> {
  const decision = await prisma.decisionRecord.create({
    data: {
      shopDomain, goalId: input.goalId, planId: input.planId, stepId: input.stepId, taskId: input.taskId,
      decisionType: input.decisionType, reasoning: input.reasoning,
      alternatives: input.alternatives ?? [], confidence: input.confidence,
      requiresApproval: input.requiresApproval ?? false,
      outcome: "PENDING",
    },
  });
  logger.debug("Decision recorded", { shopDomain, type: input.decisionType, id: decision.id });
  return decision.id;
}

export async function updateDecisionOutcome(shopDomain: string, decisionId: string, outcome: "SUCCESS" | "FAILURE" | "PARTIAL", reasoning: string, rewardScore?: number): Promise<void> {
  await prisma.decisionRecord.update({
    where: { id: decisionId },
    data: { outcome, outcomeReasoning: reasoning, rewardScore },
  });
}

export async function getDecisionHistory(shopDomain: string, limit = 50) {
  return prisma.decisionRecord.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function learnFromDecisions(shopDomain: string): Promise<{ positiveCount: number; negativeCount: number; lesson: string }> {
  const decisions = await prisma.decisionRecord.findMany({
    where: { shopDomain, outcome: { in: ["SUCCESS", "FAILURE"] } },
    take: 100,
  });

  const positiveCount = decisions.filter((d) => d.outcome === "SUCCESS").length;
  const negativeCount = decisions.filter((d) => d.outcome === "FAILURE").length;

  const successRate = decisions.length > 0 ? positiveCount / decisions.length : 0;
  const lesson = `Over ${decisions.length} decisions: ${successRate.toFixed(0)}% success rate. ${negativeCount} failures analyzed for learning.`;

  return { positiveCount, negativeCount, lesson };
}
