// Phase G: Observability — agent thinking traces, execution timelines, diagnostics
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { randomUUID } from "node:crypto";

export interface TraceSpanInput {
  agentName: string;
  spanName: string;
  spanType: "LLM" | "TOOL" | "HTTP" | "AGENT" | "DECISION";
  goalId?: string;
  planId?: string;
  stepId?: string;
  taskId?: string;
  input?: unknown;
  thinkingTrace?: string;
}

export interface TraceSpan {
  spanId: string;
  complete: (result: { output?: unknown; status?: "OK" | "ERROR" | "TIMEOUT"; errorMessage?: string; tokenCount?: number; costCredits?: number }) => Promise<void>;
}

export function traceSpan(shopDomain: string, opts: TraceSpanInput): TraceSpan {
  const spanId = randomUUID();
  const startTime = new Date();

  prisma.agentTrace.create({
    data: {
      shopDomain, traceId: spanId, goalId: opts.goalId, planId: opts.planId, stepId: opts.stepId, taskId: opts.taskId,
      agentName: opts.agentName, spanName: opts.spanName, spanType: opts.spanType,
      input: opts.input as Record<string, unknown> | undefined,
      thinkingTrace: opts.thinkingTrace,
      startTime, status: "OK",
    },
  }).catch((err) => logger.warn("Trace span create failed", { error: String(err) }));

  return {
    spanId,
    complete: async (result) => {
      const endTime = new Date();
      await prisma.agentTrace.update({
        where: { traceId: spanId },
        data: {
          endTime, durationMs: endTime.getTime() - startTime.getTime(),
          output: result.output as Record<string, unknown> | undefined,
          status: result.status ?? "OK", errorMessage: result.errorMessage,
          tokenCount: result.tokenCount, costCredits: result.costCredits,
        },
      }).catch((err) => logger.warn("Trace span complete failed", { spanId, error: String(err) }));
    },
  };
}

export async function getExecutionTimeline(shopDomain: string, goalId: string) {
  return prisma.agentTrace.findMany({
    where: { shopDomain, goalId },
    orderBy: { startTime: "asc" },
  });
}

export async function getAgentThinkingTrace(shopDomain: string, traceId: string) {
  return prisma.agentTrace.findUnique({ where: { shopDomain, traceId } });
}

export async function getFailureDiagnostics(shopDomain: string, limit = 20) {
  return prisma.agentTrace.findMany({
    where: { shopDomain, status: "ERROR" },
    orderBy: { startTime: "desc" },
    take: limit,
  });
}

export async function getPerformanceAnalytics(shopDomain: string) {
  const traces = await prisma.agentTrace.findMany({
    where: { shopDomain, startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    select: { agentName: true, spanType: true, status: true, durationMs: true, tokenCount: true, costCredits: true },
  });

  const byAgent: Record<string, { count: number; errors: number; avgMs: number; totalTokens: number; totalCredits: number }> = {};
  for (const t of traces) {
    if (!byAgent[t.agentName]) byAgent[t.agentName] = { count: 0, errors: 0, avgMs: 0, totalTokens: 0, totalCredits: 0 };
    byAgent[t.agentName].count++;
    if (t.status === "ERROR") byAgent[t.agentName].errors++;
    byAgent[t.agentName].avgMs += t.durationMs ?? 0;
    byAgent[t.agentName].totalTokens += t.tokenCount ?? 0;
    byAgent[t.agentName].totalCredits += t.costCredits ?? 0;
  }
  for (const a of Object.values(byAgent)) a.avgMs = a.count > 0 ? a.avgMs / a.count : 0;

  return { totalTraces: traces.length, byAgent };
}
