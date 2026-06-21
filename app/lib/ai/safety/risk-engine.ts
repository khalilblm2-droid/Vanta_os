// Phase F: Safety — Risk scoring, approval gates, action previews
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { generateContent } from "~/lib/ai/gemini.client";

export interface RiskInput {
  action: string;
  agent: string;
  riskLevel: string;
  goalId?: string;
  planId?: string;
  stepId?: string;
  taskId?: string;
}

export interface RiskResult {
  riskScore: number; // 0-1
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: Record<string, number>;
  mitigations: string[];
  requiresApproval: boolean;
  actionPreview: string;
  affectedResources: string[];
}

export async function scoreRisk(shopDomain: string, input: RiskInput): Promise<RiskResult> {
  // Heuristic risk factors
  const factors: Record<string, number> = {};
  const mitigations: string[] = [];
  const affectedResources: string[] = [];

  const action = input.action.toLowerCase();

  // Factor 1: Irreversibility
  if (action.includes("delete") || action.includes("remove") || action.includes("destroy")) {
    factors["irreversible"] = 0.8;
    mitigations.push("Create backup before deletion");
  }
  // Factor 2: Bulk operations
  if (action.includes("all") || action.includes("bulk") || action.includes("every")) {
    factors["bulk_operation"] = 0.7;
    mitigations.push("Preview affected items before executing");
  }
  // Factor 3: Price changes
  if (action.includes("price") || action.includes("cost") || action.includes("discount")) {
    factors["financial_impact"] = 0.6;
    mitigations.push("Verify margins remain positive");
  }
  // Factor 4: Customer-facing changes
  if (action.includes("publish") || action.includes("theme") || action.includes("storefront")) {
    factors["customer_visible"] = 0.5;
    mitigations.push("Test on a hidden product first");
  }
  // Factor 5: New product creation
  if (action.includes("create") && action.includes("product")) {
    factors["creates_new_content"] = 0.3;
  }
  // Factor 6: Declared risk level
  if (input.riskLevel === "CRITICAL") factors["declared_critical"] = 0.9;
  else if (input.riskLevel === "HIGH") factors["declared_high"] = 0.6;
  else if (input.riskLevel === "MEDIUM") factors["declared_medium"] = 0.3;

  // Composite score
  const factorValues = Object.values(factors);
  const riskScore = factorValues.length > 0
    ? Math.min(1, factorValues.reduce((a, b) => a + b, 0) / factorValues.length + factorValues.length * 0.05)
    : 0.1;

  const riskLevel: RiskResult["riskLevel"] =
    riskScore >= 0.75 ? "CRITICAL" : riskScore >= 0.5 ? "HIGH" : riskScore >= 0.25 ? "MEDIUM" : "LOW";

  const requiresApproval = riskScore >= 0.5 || input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL";

  // FIX #9: LLM risk scoring for ambiguous cases (heuristic score between 0.3 and 0.6)
  let finalRiskScore = riskScore;
  let llmReasoning = "";
  if (riskScore >= 0.3 && riskScore < 0.6) {
    try {
      const { generateContent } = await import("~/lib/ai/gemini.client");
      const llmResp = await generateContent(
        `Rate the risk of this e-commerce action (0-1 scale):
Action: ${input.action}
Agent: ${input.agent}
Heuristic risk score: ${riskScore.toFixed(2)}

Consider: irreversibility, customer impact, financial risk, scale.
Respond JSON only: {"score": 0.0, "reasoning": "...", "mitigations": ["..."]}`,
        { temperature: 0.1 },
      );
      const jsonMatch = llmResp.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const llmResult = JSON.parse(jsonMatch[0]);
        const llmScore = typeof llmResult.score === "number" ? Math.max(0, Math.min(1, llmResult.score)) : riskScore;
        finalRiskScore = riskScore * 0.4 + llmScore * 0.6;
        llmReasoning = llmResult.reasoning ?? "";
        if (Array.isArray(llmResult.mitigations)) {
          mitigations.push(...llmResult.mitigations);
        }
      }
    } catch {
      // LLM failed — use heuristic score only
    }
  }

  const finalRiskLevel: RiskResult["riskLevel"] =
    finalRiskScore >= 0.75 ? "CRITICAL" : finalRiskScore >= 0.5 ? "HIGH" : finalRiskScore >= 0.25 ? "MEDIUM" : "LOW";

  const finalRequiresApproval = finalRiskScore >= 0.5 || input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL";

  // Generate action preview
  const actionPreview = `Action: "${input.action}"\nAgent: ${input.agent}\nRisk: ${finalRiskLevel} (${(finalRiskScore * 100).toFixed(0)}%)\nFactors: ${Object.entries(factors).map(([k, v]) => `${k}=${v}`).join(", ")}\n${llmReasoning ? `AI Assessment: ${llmReasoning}\n` : ""}Mitigations: ${mitigations.join("; ")}`;

  // Persist
  await prisma.riskAssessment.create({
    data: {
      shopDomain, goalId: input.goalId, planId: input.planId, stepId: input.stepId, taskId: input.taskId,
      riskScore: finalRiskScore, riskLevel: finalRiskLevel, factors, mitigations, requiresApproval: finalRequiresApproval, actionPreview, affectedResources,
    },
  });

  logger.info("Risk scored", { shopDomain, action: input.action.slice(0, 50), riskLevel: finalRiskLevel, riskScore: finalRiskScore, usedLLM: !!llmReasoning });
  return { riskScore: finalRiskScore, riskLevel: finalRiskLevel, factors, mitigations, requiresApproval: finalRequiresApproval, actionPreview, affectedResources };
}

export async function approveAction(shopDomain: string, riskAssessmentId: string, staffId: string, decision: "PROCEED" | "MODIFY" | "REJECT"): Promise<void> {
  await prisma.riskAssessment.update({
    where: { id: riskAssessmentId },
    data: { decision, decidedBy: staffId, decidedAt: new Date() },
  });
  logger.info("Action approved/rejected", { shopDomain, riskAssessmentId, decision, staffId });
}

export async function getPendingApprovals(shopDomain: string) {
  return prisma.riskAssessment.findMany({
    where: { shopDomain, requiresApproval: true, decision: null },
    orderBy: { createdAt: "desc" },
  });
}
