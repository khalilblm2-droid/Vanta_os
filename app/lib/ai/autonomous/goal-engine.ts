// =============================================================================
// VANTA OS — Phase A: Goal Execution Engine
// (see previous content — same file)
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { generateContent } from "~/lib/ai/gemini.client";
import { enqueueTask } from "~/lib/queue/task-queue";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

// --- Types -------------------------------------------------------------------

export interface CreateGoalInput {
  shopDomain: string;
  shopId: string;
  staffId?: string;
  title: string;
  description: string;
  successCriteria?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  autonomyLevel?: "ASSISTED" | "SUPERVISED" | "AUTONOMOUS";
  deadline?: Date;
}

export interface PlanStepSpec {
  agent: string;
  action: string;
  dependsOn: number[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedCredits: number;
}

export interface GeneratedPlan {
  reasoning: string;
  steps: PlanStepSpec[];
  estimatedDurationMin: number;
  totalRiskScore: number;
}

// --- Phase A.1: Goal Creation ------------------------------------------------

export async function createGoal(input: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      shopDomain: input.shopDomain,
      staffId: input.staffId,
      title: input.title,
      description: input.description,
      successCriteria: input.successCriteria,
      priority: input.priority ?? "NORMAL",
      autonomyLevel: input.autonomyLevel ?? "ASSISTED",
      deadline: input.deadline,
      status: "ACTIVE",
      startedAt: new Date(),
    },
  });
  logger.info("Goal created", { goalId: goal.id, title: input.title });
  return goal;
}

// --- Phase A.2: Multi-Step Planning ------------------------------------------

export async function generatePlan(goalId: string): Promise<GeneratedPlan> {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId } });

  const prompt = `You are VANTA OS's Planner Agent. A merchant has set this goal:

Title: ${goal.title}
Description: ${goal.description}
Success criteria: ${goal.successCriteria ?? "Not specified"}
Autonomy level: ${goal.autonomyLevel}

Create a detailed multi-step execution plan. Each step must be:
- Concrete and actionable
- Assigned to a specific agent (planner, research, product_hunter, store_optimizer, marketing, analyst, reviewer)
- Have clear dependencies on previous steps
- Have a risk level (LOW/MEDIUM/HIGH/CRITICAL)

Output JSON only:
{
  "reasoning": "<why this plan will achieve the goal>",
  "steps": [
    { "agent": "<agent_name>", "action": "<specific action>", "dependsOn": [<step_numbers>], "riskLevel": "LOW", "estimatedCredits": 2 }
  ],
  "estimatedDurationMin": 30,
  "totalRiskScore": 0.2
}`;

  const response = await generateContent(prompt, { temperature: 0.4 });
  let plan: GeneratedPlan;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    plan = JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    plan = {
      reasoning: "Fallback plan",
      steps: [{ agent: "research", action: `Research: ${goal.title}`, dependsOn: [], riskLevel: "LOW", estimatedCredits: 2 }],
      estimatedDurationMin: 30,
      totalRiskScore: 0.2,
    };
  }

  const planRow = await prisma.plan.create({
    data: {
      goalId: goal.id,
      shopDomain: goal.shopDomain,
      reasoning: plan.reasoning,
      status: goal.autonomyLevel === "AUTONOMOUS" ? "APPROVED" : "DRAFT",
      totalSteps: plan.steps.length,
    },
  });

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    await prisma.planStep.create({
      data: {
        planId: planRow.id,
        shopDomain: goal.shopDomain,
        stepNumber: i + 1,
        agent: step.agent,
        action: step.action,
        dependsOn: step.dependsOn.map(String),
        riskLevel: step.riskLevel,
        estimatedCredits: step.estimatedCredits,
        maxAttempts: 3,
        status: "PENDING",
      },
    });
  }

  await prisma.goal.update({
    where: { id: goal.id },
    data: { totalSteps: plan.steps.length, estimatedDurationMin: plan.estimatedDurationMin, riskScore: plan.totalRiskScore },
  });

  logger.info("Plan generated", { goalId, planId: planRow.id, steps: plan.steps.length });
  return plan;
}

// --- Phase A.3: Plan Execution -----------------------------------------------

export async function executePlan(planId: string): Promise<{ completed: boolean; failedSteps: number }> {
  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (plan.status === "DRAFT") {
    const goal = await prisma.goal.findUniqueOrThrow({ where: { id: plan.goalId } });
    if (goal.autonomyLevel !== "AUTONOMOUS") {
      logger.warn("Plan not approved", { planId });
      return { completed: false, failedSteps: 0 };
    }
    await prisma.plan.update({ where: { id: planId }, data: { status: "EXECUTING" } });
  }

  if (await isKillSwitchOn(plan.shopDomain)) {
    await prisma.plan.update({ where: { id: planId }, data: { status: "FAILED", lastRevisionReason: "Kill switch" } });
    return { completed: false, failedSteps: 0 };
  }

  let failedSteps = 0;
  let completedCount = 0;

  for (const step of plan.steps) {
    if (step.status === "COMPLETED") { completedCount++; continue; }

    const deps = step.dependsOn as string[];
    if (deps.length > 0) {
      const depSteps = await prisma.planStep.findMany({
        where: { planId, stepNumber: { in: deps.map(Number) } },
        select: { status: true },
      });
      if (!depSteps.every((d) => d.status === "COMPLETED" || d.status === "SKIPPED")) {
        await prisma.planStep.update({ where: { id: step.id }, data: { status: "BLOCKED" } });
        continue;
      }
    }

    const result = await executeStep(step.id, plan.goalId, planId);
    if (result.success) completedCount++;
    else {
      failedSteps++;
      if (step.attemptCount >= step.maxAttempts) {
        await selfHealPlan(planId, step.id, result.error ?? "Unknown");
      }
    }
  }

  const allComplete = completedCount === plan.steps.length;
  await prisma.plan.update({ where: { id: planId }, data: { status: allComplete ? "COMPLETED" : "FAILED", completedSteps: completedCount } });
  await updateGoalProgress(plan.goalId);
  return { completed: allComplete, failedSteps };
}

// --- Phase A.4: Step Execution -----------------------------------------------

async function executeStep(stepId: string, goalId: string, planId: string): Promise<{ success: boolean; error?: string }> {
  const step = await prisma.planStep.findUniqueOrThrow({ where: { id: stepId } });
  const startTime = Date.now();

  await prisma.planStep.update({
    where: { id: stepId },
    data: { status: "RUNNING", startedAt: new Date(), attemptCount: { increment: 1 }, checkpoint: { attempt: step.attemptCount + 1 } },
  });

  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: step.shopDomain },
      select: {
        id: true,
        canWriteProducts: true,
        canWriteCollections: true,
        canWriteInventory: true,
        canWriteMetafields: true,
        canWriteThemes: true,
        canReadOrders: true,
        canReadCustomers: true,
      },
    });

    // FIX #14: Risk check for CRITICAL steps under SUPERVISED autonomy
    const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId } });
    if (step.riskLevel === "CRITICAL" && goal.autonomyLevel === "SUPERVISED") {
      // Mark as awaiting approval — send notification
      await prisma.planStep.update({ where: { id: stepId }, data: { status: "PENDING" } });
      logger.warn("Critical step requires approval under SUPERVISED autonomy", { stepId, goalId });
      return { success: false, error: "Critical step requires merchant approval" };
    }

    const task = await prisma.task.create({
      data: {
        shopId: shop?.id ?? "",
        shopDomain: step.shopDomain,
        command: `[Step ${step.stepNumber}] ${step.action}`,
        language: "en",
        status: "QUEUED",
        priority: "HIGH",
        estimatedCredits: step.estimatedCredits,
      },
    });

    await enqueueTask({ taskId: task.id, shopDomain: step.shopDomain, enqueuedAt: new Date().toISOString() }, "HIGH");
    const result = await waitForTaskCompletion(task.id, 120_000);

    await prisma.planStep.update({
      where: { id: stepId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        taskId: task.id,
        result: result.data as Record<string, unknown> | undefined,
        errorMessage: result.error,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    return { success: result.success, error: result.error };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.planStep.update({ where: { id: stepId }, data: { status: "FAILED", errorMessage: errorMsg, completedAt: new Date(), durationMs: Date.now() - startTime } });
    return { success: false, error: errorMsg };
  }
}

async function waitForTaskCompletion(taskId: string, timeoutMs: number): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true, output: true, errorMessage: true } });
    if (!task) return { success: false, error: "Task not found" };
    if (task.status === "COMPLETED") return { success: true, data: task.output };
    if (task.status === "ERROR") return { success: false, error: task.errorMessage ?? "Failed" };
    if (task.status === "CANCELLED") return { success: false, error: "Cancelled" };
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { success: false, error: "Timeout" };
}

// --- Phase A.5: Self-Healing -------------------------------------------------

async function selfHealPlan(planId: string, failedStepId: string, failureReason: string): Promise<void> {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId }, include: { steps: { orderBy: { stepNumber: "asc" } } } });
  const failedStep = plan.steps.find((s) => s.id === failedStepId);
  if (!failedStep) return;

  logger.info("Self-healing plan", { planId, failedStep: failedStep.stepNumber });

  const prompt = `Step failed: "${failedStep.action}" (agent: ${failedStep.agent}, reason: ${failureReason}). Generate an alternative. Output JSON: {"alternativeAction":"...","reasoning":"...","riskLevel":"LOW"}`;
  const response = await generateContent(prompt, { temperature: 0.5 });
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  const alt = jsonMatch ? JSON.parse(jsonMatch[0]) : { alternativeAction: failedStep.action, reasoning: "Retry", riskLevel: failedStep.riskLevel };

  const newPlan = await prisma.plan.create({
    data: {
      goalId: plan.goalId, shopDomain: plan.shopDomain, version: plan.version + 1,
      reasoning: `Self-healed: ${alt.reasoning}`, status: "EXECUTING", totalSteps: plan.steps.length,
      revisionCount: plan.revisionCount + 1, lastRevisionReason: failureReason,
    },
  });

  for (const step of plan.steps) {
    await prisma.planStep.create({
      data: {
        planId: newPlan.id, shopDomain: step.shopDomain, stepNumber: step.stepNumber, agent: step.agent,
        action: step.id === failedStepId ? alt.alternativeAction : step.action,
        dependsOn: step.dependsOn, riskLevel: step.id === failedStepId ? alt.riskLevel ?? step.riskLevel : step.riskLevel,
        estimatedCredits: step.estimatedCredits, maxAttempts: 3,
        status: step.id === failedStepId ? "PENDING" : step.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      },
    });
  }

  await prisma.plan.update({ where: { id: planId }, data: { status: "SUPERSEDED" } });
  logger.info("Plan self-healed", { oldPlanId: planId, newPlanId: newPlan.id });
}

async function updateGoalProgress(goalId: string): Promise<void> {
  const plans = await prisma.plan.findMany({ where: { goalId, status: { in: ["EXECUTING", "COMPLETED"] } }, include: { steps: { select: { status: true } } } });
  const totalSteps = plans.reduce((s, p) => s + p.steps.length, 0);
  const completedSteps = plans.reduce((s, p) => s + p.steps.filter((st) => st.status === "COMPLETED").length, 0);
  const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const allComplete = completedSteps === totalSteps && totalSteps > 0;
  await prisma.goal.update({ where: { id: goalId }, data: { progress, completedSteps, status: allComplete ? "COMPLETED" : "ACTIVE", completedAt: allComplete ? new Date() : null } });
}
