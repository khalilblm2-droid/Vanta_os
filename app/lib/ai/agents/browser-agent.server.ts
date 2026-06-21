// =============================================================================
// VANTA OS — Browser Agent
// =============================================================================
// A merchant-authorized browser automation tool. Subordinate to the agent system.
// Uses Playwright when installed; returns clear "not available" status otherwise.
// No credential-based authentication. No email/password storage.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { randomBytes } from "node:crypto";
import { scoreRisk } from "~/lib/ai/safety/risk-engine";
import { recordDecision } from "~/lib/ai/memory/decision-tracker";
import { traceSpan } from "~/lib/ai/observability/tracer";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

// --- Types -------------------------------------------------------------------

export type BrowserActionType =
  | "NAVIGATE"
  | "CLICK"
  | "INPUT"
  | "SELECT"
  | "WAIT"
  | "SCREENSHOT"
  | "SCROLL"
  | "DOWNLOAD"
  | "UPLOAD"
  | "EXTRACT"
  | "CLOSE";

export interface BrowserStep {
  id: string;
  action: BrowserActionType;
  target?: string;
  value?: string;
  waitFor?: string;
  description?: string;
  screenshot?: boolean;
  condition?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface BrowserWorkflowInput {
  shopDomain: string;
  goalId?: string;
  planStepId?: string;
  connectedAccountId?: string;
  name: string;
  description?: string;
  steps: BrowserStep[];
  requiresApproval?: boolean;
}

export interface BrowserWorkflowResult {
  workflowId: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  result?: unknown;
  error?: string;
  screenshots: string[];
}

// --- Session Management -------------------------------------------------------

export async function createBrowserSession(
  shopDomain: string,
  connectedAccountId?: string,
): Promise<string> {
  const sessionKey = `${shopDomain}:${randomBytes(8).toString("hex")}`;
  const session = await prisma.browserSession.create({
    data: {
      shopDomain,
      connectedAccountId,
      sessionKey,
      status: "IDLE",
      userAgent: "VANTA-OS-Browser-Agent/1.0",
      viewport: { width: 1280, height: 720 },
    },
  });
  logger.info("Browser session created", { shopDomain, sessionId: session.id });
  return session.id;
}

export async function saveSessionState(sessionId: string, storageState: unknown): Promise<void> {
  await prisma.browserSession.update({
    where: { id: sessionId },
    data: { storageState: storageState as Record<string, unknown>, lastActivityAt: new Date() },
  });
}

export async function closeBrowserSession(sessionId: string): Promise<void> {
  await prisma.browserSession.update({
    where: { id: sessionId },
    data: { status: "CLOSED", endedAt: new Date() },
  });
}

// --- Workflow Execution -------------------------------------------------------

export async function createBrowserWorkflow(input: BrowserWorkflowInput): Promise<string> {
  if (await isKillSwitchOn(input.shopDomain)) {
    throw new Error("Kill switch is enabled — browser workflows are blocked");
  }
  const workflow = await prisma.browserWorkflow.create({
    data: {
      shopDomain: input.shopDomain,
      goalId: input.goalId,
      planStepId: input.planStepId,
      connectedAccountId: input.connectedAccountId,
      name: input.name,
      description: input.description,
      steps: input.steps as unknown as Record<string, unknown>[],
      status: "PENDING",
      requiresApproval: input.requiresApproval ?? true,
      maxAttempts: 3,
    },
  });
  logger.info("Browser workflow created", { shopDomain: input.shopDomain, workflowId: workflow.id, steps: input.steps.length });
  return workflow.id;
}

export async function executeBrowserWorkflow(
  workflowId: string,
  approvedBy?: string,
): Promise<BrowserWorkflowResult> {
  const workflow = await prisma.browserWorkflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { connectedAccount: true },
  });

  if (workflow.requiresApproval && !workflow.approvedBy && !approvedBy) {
    await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "AWAITING_APPROVAL" } });
    return { workflowId, status: "AWAITING_APPROVAL", completedSteps: 0, totalSteps: (workflow.steps as unknown[]).length, screenshots: [] };
  }

  if (await isKillSwitchOn(workflow.shopDomain)) {
    return { workflowId, status: "CANCELLED", completedSteps: 0, totalSteps: (workflow.steps as unknown[]).length, error: "Kill switch enabled", screenshots: [] };
  }

  let sessionId = workflow.sessionId;
  if (!sessionId) {
    sessionId = await createBrowserSession(workflow.shopDomain, workflow.connectedAccountId ?? undefined);
    await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { sessionId } });
  }

  const steps = workflow.steps as unknown as BrowserStep[];
  const startTime = Date.now();
  let completedSteps = workflow.currentStep;
  const screenshots: string[] = [];

  await prisma.browserWorkflow.update({
    where: { id: workflowId },
    data: { status: "RUNNING", startedAt: new Date(), attemptCount: { increment: 1 } },
  });

  for (let i = workflow.currentStep; i < steps.length; i++) {
    const step = steps[i];

    const risk = await scoreRisk(workflow.shopDomain, {
      action: step.description ?? `${step.action} ${step.target ?? ""}`,
      agent: "browser_agent",
      riskLevel: step.riskLevel ?? "MEDIUM",
      goalId: workflow.goalId ?? undefined,
      planStepId: workflow.planStepId ?? undefined,
    });

    if (risk.requiresApproval && !approvedBy) {
      await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "AWAITING_APPROVAL", currentStep: i } });
      return { workflowId, status: "AWAITING_APPROVAL", completedSteps: i, totalSteps: steps.length, screenshots };
    }

    await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { checkpoint: { stepIndex: i, sessionId } } });

    const trace = traceSpan(workflow.shopDomain, {
      agentName: "browser_agent",
      spanName: `step_${i + 1}_${step.action.toLowerCase()}`,
      spanType: "TOOL",
      goalId: workflow.goalId ?? undefined,
      input: { step, target: step.target },
    });

    try {
      const result = await executeBrowserAction(sessionId!, workflowId, step);
      completedSteps = i + 1;
      if (result.screenshot) screenshots.push(result.screenshot);
      await trace.complete({ output: result.data, status: "OK" });
      await recordDecision(workflow.shopDomain, {
        planStepId: workflow.planStepId ?? undefined,
        decisionType: "EXECUTE",
        reasoning: `Browser step ${i + 1}: ${step.description ?? step.action}`,
        confidence: 0.8,
        requiresApproval: false,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await trace.complete({ status: "ERROR", errorMessage: errorMsg });
      const currentAttempt = await prisma.browserWorkflow.findUnique({ where: { id: workflowId }, select: { attemptCount: true, maxAttempts: true } });
      if (currentAttempt && currentAttempt.attemptCount < currentAttempt.maxAttempts) {
        logger.warn("Browser step failed — retrying", { workflowId, step: i + 1, error: errorMsg });
        await new Promise((r) => setTimeout(r, 2000 * currentAttempt.attemptCount));
        i--;
        continue;
      }
      await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "FAILED", errorMessage: `Step ${i + 1} failed: ${errorMsg}`, completedAt: new Date(), durationMs: Date.now() - startTime } });
      return { workflowId, status: "FAILED", completedSteps: i, totalSteps: steps.length, error: errorMsg, screenshots };
    }
  }

  await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "COMPLETED", currentStep: steps.length, completedAt: new Date(), durationMs: Date.now() - startTime } });
  if (sessionId) await closeBrowserSession(sessionId);
  logger.info("Browser workflow completed", { workflowId, steps: steps.length });
  return { workflowId, status: "COMPLETED", completedSteps: steps.length, totalSteps: steps.length, screenshots };
}

/**
 * Execute a single browser action.
 * Attempts to use Playwright if installed. If Playwright is not available,
 * returns a clear error if Playwright is not installed.
 */
async function executeBrowserAction(
  sessionId: string,
  workflowId: string,
  step: BrowserStep,
): Promise<{ success: boolean; data?: unknown; screenshot?: string }> {
  const startTime = Date.now();
  const session = await prisma.browserSession.findUnique({ where: { id: sessionId }, select: { shopDomain: true } });
  const shopDomain = session?.shopDomain ?? "";

  const action = await prisma.browserAction.create({
    data: {
      shopDomain, sessionId, workflowId, stepNumber: 0,
      actionType: step.action, target: step.target, value: step.value,
      status: "RUNNING", startedAt: new Date(),
    },
  });

  try {
    let resultData: unknown = null;

    // Attempt to dynamically import Playwright
    let playwrightAvailable = false;
    try {
      await import("playwright");
      playwrightAvailable = true;
    } catch {
      // Playwright not installed — will handle below
    }

    if (!playwrightAvailable) {
      throw new Error(
        "Playwright is not installed. Browser automation requires: npm install playwright && npx playwright install chromium"
      );
    }

    // Real Playwright execution
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Restore session state if available
    const fullSession = await prisma.browserSession.findUnique({ where: { id: sessionId }, select: { storageState: true } });
    if (fullSession?.storageState) {
      await context.addCookies(fullSession.storageState as never[]);
    }

    const page = await context.newPage();

    switch (step.action) {
      case "NAVIGATE":
        if (!step.target) throw new Error("NAVIGATE requires a target URL");
        await page.goto(step.target, { waitUntil: "networkidle", timeout: 30000 });
        resultData = { url: page.url(), title: await page.title() };
        break;

      case "CLICK":
        if (!step.target) throw new Error("CLICK requires a CSS selector");
        await page.click(step.target, { timeout: 10000 });
        resultData = { clicked: step.target };
        break;

      case "INPUT":
        if (!step.target || step.value === undefined) throw new Error("INPUT requires target and value");
        await page.fill(step.target, step.value, { timeout: 10000 });
        resultData = { filled: step.target, value: step.value };
        break;

      case "SELECT":
        if (!step.target || step.value === undefined) throw new Error("SELECT requires target and value");
        await page.selectOption(step.target, step.value, { timeout: 10000 });
        resultData = { selected: step.target, value: step.value };
        break;

      case "WAIT":
        if (step.waitFor) {
          await page.waitForSelector(step.waitFor, { timeout: 10000 });
          resultData = { waitedFor: step.waitFor };
        } else {
          await page.waitForTimeout(1000);
          resultData = { waited: 1000 };
        }
        break;

      case "SCREENSHOT":
        const screenshotBuffer = await page.screenshot({ type: "png", fullPage: false });
        const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
        resultData = { screenshot: screenshotBase64 };
        break;

      case "SCROLL":
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        resultData = { scrolled: "bottom" };
        break;

      case "EXTRACT":
        if (!step.target) throw new Error("EXTRACT requires a CSS selector");
        const text = await page.textContent(step.target, { timeout: 10000 });
        resultData = { extracted: text };
        break;

      case "CLOSE":
        await page.close();
        resultData = { closed: true };
        break;

      default:
        throw new Error(`Unknown action type: ${step.action}`);
    }

    // Save session state (cookies) for persistence
    const cookies = await context.cookies();
    await saveSessionState(sessionId, cookies);

    await browser.close();

    await prisma.browserAction.update({
      where: { id: action.id },
      data: {
        status: "SUCCESS",
        resultData: resultData as Record<string, unknown>,
        screenshotUrl: step.screenshot ? (resultData as { screenshot?: string })?.screenshot : undefined,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    logger.info("Browser action executed", { sessionId, action: step.action, target: step.target });

    return {
      success: true,
      data: resultData,
      screenshot: step.screenshot ? (resultData as { screenshot?: string })?.screenshot : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.browserAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
        errorMessage: errorMsg,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });
    throw err;
  }
}

export async function approveBrowserWorkflow(shopDomain: string, workflowId: string, staffId: string): Promise<void> {
  await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { approvedBy: staffId, approvedAt: new Date(), status: "PENDING" } });
  logger.info("Browser workflow approved", { shopDomain, workflowId, staffId });
}

export async function getBrowserWorkflows(shopDomain: string, limit = 20) {
  return prisma.browserWorkflow.findMany({
    where: { shopDomain }, orderBy: { createdAt: "desc" }, take: limit,
    include: { connectedAccount: { select: { accountType: true, accountName: true } }, _count: { select: { actions: true } } },
  });
}

export async function getBrowserWorkflowDetail(workflowId: string, shopDomain: string) {
  return prisma.browserWorkflow.findFirst({
    where: { id: workflowId, shopDomain },
    include: { actions: { orderBy: { stepNumber: "asc" } }, connectedAccount: { select: { accountType: true, accountName: true } }, session: { select: { status: true, currentUrl: true, lastActivityAt: true } } },
  });
}
