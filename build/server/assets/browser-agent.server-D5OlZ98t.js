import { i as isKillSwitchOn, p as prisma, l as logger, s as scoreRisk, t as traceSpan, r as recordDecision } from "./server-build-BZO8iW4T.js";
import { randomBytes } from "node:crypto";
import "react/jsx-runtime";
import "node:stream";
import "@remix-run/node";
import "@remix-run/react";
import "isbot";
import "react-dom/server";
import "zod";
import "node:fs";
import "node:path";
import "@shopify/shopify-app-remix/adapters/node";
import "@shopify/shopify-app-remix/server";
import "@shopify/shopify-app-session-storage-prisma";
import "@shopify/shopify-api";
import "@prisma/client";
import "bullmq";
import "ioredis";
import "lucide-react";
import "react";
import "framer-motion";
import "clsx";
import "tailwind-merge";
import "react-markdown";
import "remark-gfm";
import "@shopify/polaris";
import "@shopify/polaris-icons";
async function createBrowserSession(shopDomain, connectedAccountId) {
  const sessionKey = `${shopDomain}:${randomBytes(8).toString("hex")}`;
  const session = await prisma.browserSession.create({
    data: {
      shopDomain,
      connectedAccountId,
      sessionKey,
      status: "IDLE",
      userAgent: "VANTA-OS-Browser-Agent/1.0",
      viewport: { width: 1280, height: 720 }
    }
  });
  logger.info("Browser session created", { shopDomain, sessionId: session.id });
  return session.id;
}
async function saveSessionState(sessionId, storageState) {
  await prisma.browserSession.update({
    where: { id: sessionId },
    data: { storageState, lastActivityAt: /* @__PURE__ */ new Date() }
  });
}
async function closeBrowserSession(sessionId) {
  await prisma.browserSession.update({
    where: { id: sessionId },
    data: { status: "CLOSED", endedAt: /* @__PURE__ */ new Date() }
  });
}
async function createBrowserWorkflow(input) {
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
      steps: input.steps,
      status: "PENDING",
      requiresApproval: input.requiresApproval ?? true,
      maxAttempts: 3
    }
  });
  logger.info("Browser workflow created", { shopDomain: input.shopDomain, workflowId: workflow.id, steps: input.steps.length });
  return workflow.id;
}
async function executeBrowserWorkflow(workflowId, approvedBy) {
  const workflow = await prisma.browserWorkflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { connectedAccount: true }
  });
  if (workflow.requiresApproval && !workflow.approvedBy && !approvedBy) {
    await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "AWAITING_APPROVAL" } });
    return { workflowId, status: "AWAITING_APPROVAL", completedSteps: 0, totalSteps: workflow.steps.length, screenshots: [] };
  }
  if (await isKillSwitchOn(workflow.shopDomain)) {
    return { workflowId, status: "CANCELLED", completedSteps: 0, totalSteps: workflow.steps.length, error: "Kill switch enabled", screenshots: [] };
  }
  let sessionId = workflow.sessionId;
  if (!sessionId) {
    sessionId = await createBrowserSession(workflow.shopDomain, workflow.connectedAccountId ?? void 0);
    await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { sessionId } });
  }
  const steps = workflow.steps;
  const startTime = Date.now();
  let completedSteps = workflow.currentStep;
  const screenshots = [];
  await prisma.browserWorkflow.update({
    where: { id: workflowId },
    data: { status: "RUNNING", startedAt: /* @__PURE__ */ new Date(), attemptCount: { increment: 1 } }
  });
  for (let i = workflow.currentStep; i < steps.length; i++) {
    const step = steps[i];
    const risk = await scoreRisk(workflow.shopDomain, {
      action: step.description ?? `${step.action} ${step.target ?? ""}`,
      agent: "browser_agent",
      riskLevel: step.riskLevel ?? "MEDIUM",
      goalId: workflow.goalId ?? void 0,
      planStepId: workflow.planStepId ?? void 0
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
      goalId: workflow.goalId ?? void 0,
      input: { step, target: step.target }
    });
    try {
      const result = await executeBrowserAction(sessionId, workflowId, step);
      completedSteps = i + 1;
      if (result.screenshot) screenshots.push(result.screenshot);
      await trace.complete({ output: result.data, status: "OK" });
      await recordDecision(workflow.shopDomain, {
        planStepId: workflow.planStepId ?? void 0,
        decisionType: "EXECUTE",
        reasoning: `Browser step ${i + 1}: ${step.description ?? step.action}`,
        confidence: 0.8,
        requiresApproval: false
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await trace.complete({ status: "ERROR", errorMessage: errorMsg });
      const currentAttempt = await prisma.browserWorkflow.findUnique({ where: { id: workflowId }, select: { attemptCount: true, maxAttempts: true } });
      if (currentAttempt && currentAttempt.attemptCount < currentAttempt.maxAttempts) {
        logger.warn("Browser step failed — retrying", { workflowId, step: i + 1, error: errorMsg });
        await new Promise((r) => setTimeout(r, 2e3 * currentAttempt.attemptCount));
        i--;
        continue;
      }
      await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "FAILED", errorMessage: `Step ${i + 1} failed: ${errorMsg}`, completedAt: /* @__PURE__ */ new Date(), durationMs: Date.now() - startTime } });
      return { workflowId, status: "FAILED", completedSteps: i, totalSteps: steps.length, error: errorMsg, screenshots };
    }
  }
  await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { status: "COMPLETED", currentStep: steps.length, completedAt: /* @__PURE__ */ new Date(), durationMs: Date.now() - startTime } });
  if (sessionId) await closeBrowserSession(sessionId);
  logger.info("Browser workflow completed", { workflowId, steps: steps.length });
  return { workflowId, status: "COMPLETED", completedSteps: steps.length, totalSteps: steps.length, screenshots };
}
async function executeBrowserAction(sessionId, workflowId, step) {
  const startTime = Date.now();
  const session = await prisma.browserSession.findUnique({ where: { id: sessionId }, select: { shopDomain: true } });
  const shopDomain = session?.shopDomain ?? "";
  const action = await prisma.browserAction.create({
    data: {
      shopDomain,
      sessionId,
      workflowId,
      stepNumber: 0,
      actionType: step.action,
      target: step.target,
      value: step.value,
      status: "RUNNING",
      startedAt: /* @__PURE__ */ new Date()
    }
  });
  try {
    let resultData = null;
    let playwrightAvailable = false;
    try {
      await import("playwright");
      playwrightAvailable = true;
    } catch {
    }
    if (!playwrightAvailable) {
      throw new Error(
        "Playwright is not installed. Browser automation requires: npm install playwright && npx playwright install chromium"
      );
    }
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const fullSession = await prisma.browserSession.findUnique({ where: { id: sessionId }, select: { storageState: true } });
    if (fullSession?.storageState) {
      await context.addCookies(fullSession.storageState);
    }
    const page = await context.newPage();
    switch (step.action) {
      case "NAVIGATE":
        if (!step.target) throw new Error("NAVIGATE requires a target URL");
        await page.goto(step.target, { waitUntil: "networkidle", timeout: 3e4 });
        resultData = { url: page.url(), title: await page.title() };
        break;
      case "CLICK":
        if (!step.target) throw new Error("CLICK requires a CSS selector");
        await page.click(step.target, { timeout: 1e4 });
        resultData = { clicked: step.target };
        break;
      case "INPUT":
        if (!step.target || step.value === void 0) throw new Error("INPUT requires target and value");
        await page.fill(step.target, step.value, { timeout: 1e4 });
        resultData = { filled: step.target, value: step.value };
        break;
      case "SELECT":
        if (!step.target || step.value === void 0) throw new Error("SELECT requires target and value");
        await page.selectOption(step.target, step.value, { timeout: 1e4 });
        resultData = { selected: step.target, value: step.value };
        break;
      case "WAIT":
        if (step.waitFor) {
          await page.waitForSelector(step.waitFor, { timeout: 1e4 });
          resultData = { waitedFor: step.waitFor };
        } else {
          await page.waitForTimeout(1e3);
          resultData = { waited: 1e3 };
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
        const text = await page.textContent(step.target, { timeout: 1e4 });
        resultData = { extracted: text };
        break;
      case "CLOSE":
        await page.close();
        resultData = { closed: true };
        break;
      default:
        throw new Error(`Unknown action type: ${step.action}`);
    }
    const cookies = await context.cookies();
    await saveSessionState(sessionId, cookies);
    await browser.close();
    await prisma.browserAction.update({
      where: { id: action.id },
      data: {
        status: "SUCCESS",
        resultData,
        screenshotUrl: step.screenshot ? resultData?.screenshot : void 0,
        completedAt: /* @__PURE__ */ new Date(),
        durationMs: Date.now() - startTime
      }
    });
    logger.info("Browser action executed", { sessionId, action: step.action, target: step.target });
    return {
      success: true,
      data: resultData,
      screenshot: step.screenshot ? resultData?.screenshot : void 0
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.browserAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
        errorMessage: errorMsg,
        completedAt: /* @__PURE__ */ new Date(),
        durationMs: Date.now() - startTime
      }
    });
    throw err;
  }
}
async function approveBrowserWorkflow(shopDomain, workflowId, staffId) {
  await prisma.browserWorkflow.update({ where: { id: workflowId }, data: { approvedBy: staffId, approvedAt: /* @__PURE__ */ new Date(), status: "PENDING" } });
  logger.info("Browser workflow approved", { shopDomain, workflowId, staffId });
}
async function getBrowserWorkflows(shopDomain, limit = 20) {
  return prisma.browserWorkflow.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { connectedAccount: { select: { accountType: true, accountName: true } }, _count: { select: { actions: true } } }
  });
}
export {
  approveBrowserWorkflow,
  closeBrowserSession,
  createBrowserSession,
  createBrowserWorkflow,
  executeBrowserWorkflow,
  getBrowserWorkflows,
  saveSessionState
};
//# sourceMappingURL=browser-agent.server-D5OlZ98t.js.map
