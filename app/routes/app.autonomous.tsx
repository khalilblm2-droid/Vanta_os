// VANTA OS — Autonomous Operations Hub (Phases B-G unified dashboard)
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Bot, Search, Package, TrendingUp, Shield, Activity, Brain, Clock } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { listSpecializedAgents } from "~/lib/ai/agents/specialized-agents";
import { discoverProducts, evaluateOpportunities, getTopOpportunities } from "~/lib/ai/agents/product-hunter";
import { getPendingApprovals } from "~/lib/ai/safety/risk-engine";
import { getPerformanceAnalytics, getFailureDiagnostics } from "~/lib/ai/observability/tracer";
import { learnFromDecisions } from "~/lib/ai/memory/decision-tracker";
import { useToast } from "~/components/ui/Toaster";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const [opportunities, pendingApprovals, analytics, failures, learning] = await Promise.all([
    getTopOpportunities(ctx.shopDomain, 10),
    getPendingApprovals(ctx.shopDomain),
    getPerformanceAnalytics(ctx.shopDomain).catch(() => ({ totalTraces: 0, byAgent: {} })),
    getFailureDiagnostics(ctx.shopDomain, 5).catch(() => []),
    learnFromDecisions(ctx.shopDomain).catch(() => ({ positiveCount: 0, negativeCount: 0, lesson: "No data yet" })),
  ]);

  return json({
    shopDomain: ctx.shopDomain,
    agents: listSpecializedAgents(),
    opportunities,
    pendingApprovals,
    analytics,
    failures,
    learning,
    memoryCount: await prisma.memory.count({ where: { shopDomain: ctx.shopDomain } }).catch(() => 0),
    decisionCount: await prisma.decisionRecord.count({ where: shopScoped(ctx.shopDomain) }).catch(() => 0),
  });
}

export function headers(_: HeadersArgs) { return getSecurityHeaders(); }

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();

  if (body.action === "discover_products") {
    const candidates = await discoverProducts(ctx.shopDomain, body.niche);
    return json({ ok: true, count: candidates.length });
  }
  if (body.action === "evaluate_opportunities") {
    const evaluated = await evaluateOpportunities(ctx.shopDomain);
    return json({ ok: true, count: evaluated.length });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function AutonomousHub() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();

  const discover = () => {
    fetcher.submit({ action: "discover_products" }, { method: "post", encType: "application/json" });
    toast.info("Product Hunter active", "Scanning for winning products...");
  };
  const evaluate = () => {
    fetcher.submit({ action: "evaluate_opportunities" }, { method: "post", encType: "application/json" });
    toast.info("Evaluating", "Scoring demand, competition, and margins...");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" />Autonomous Operations</h1>
        <p className="text-sm text-vanta-muted mt-1">7 AI agents collaborating to research, plan, execute, and learn — while you stay in control.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Brain className="h-4 w-4" />} label="Memories" value={String(data.memoryCount)} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Decisions logged" value={String(data.decisionCount)} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Pending approvals" value={String(data.pendingApprovals.length)} color="amber" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Product opportunities" value={String(data.opportunities.length)} color="emerald" />
      </div>

      {/* Multi-Agent System (Phase B) */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Bot className="h-4 w-4" />Specialized Agents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.agents.map((agent) => (
            <div key={agent.name} className="vanta-card p-4">
              <h3 className="font-semibold text-sm">{agent.role}</h3>
              <p className="text-xs text-vanta-muted mt-1 line-clamp-2">{agent.systemPrompt.slice(0, 100)}...</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((c) => (<span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-vanta-100 dark:bg-vanta-800 text-vanta-muted">{c}</span>))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Discovery (Phase C) */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Search className="h-4 w-4" />Product Discovery</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={discover} className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1.5"><Search className="h-3 w-3" />Discover Products</button>
          <button onClick={evaluate} className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:opacity-80 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" />Evaluate</button>
        </div>
        {data.opportunities.length === 0 ? (
          <p className="text-xs text-vanta-muted">No opportunities yet. Click "Discover" to let the Product Hunter find winning products.</p>
        ) : (
          <div className="vanta-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase text-vanta-muted">
                  <tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Margin</th><th className="px-3 py-2 text-center">Score</th><th className="px-3 py-2 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-vanta-border">
                  {data.opportunities.map((opp) => (
                    <tr key={opp.id}>
                      <td className="px-3 py-2 truncate max-w-[180px]">{opp.title}</td>
                      <td className="px-3 py-2 text-right text-xs">${opp.supplierCost?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-xs">${opp.suggestedPrice?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-xs text-emerald-600">{opp.estimatedMarginPercent?.toFixed(0) ?? "—"}%</td>
                      <td className="px-3 py-2 text-center"><span className={`text-xs font-bold ${opp.overallScore >= 70 ? "text-emerald-600" : opp.overallScore >= 50 ? "text-amber-600" : "text-rose-600"}`}>{opp.overallScore.toFixed(0)}</span></td>
                      <td className="px-3 py-2 text-center"><span className="text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800">{opp.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Safety: Pending Approvals (Phase F) */}
      {data.pendingApprovals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" />Pending Approvals</h2>
          <div className="space-y-2">
            {data.pendingApprovals.slice(0, 5).map((a) => (
              <div key={a.id} className="vanta-card p-3 border-amber-300 dark:border-amber-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Risk: {a.riskLevel} ({(a.riskScore * 100).toFixed(0)}%)</p>
                    <p className="text-[10px] text-vanta-muted mt-0.5 line-clamp-2">{a.actionPreview}</p>
                  </div>
                  <span className="text-[10px] text-vanta-muted shrink-0">{formatRelativeTime(a.createdAt, "en")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observability: Performance + Failures (Phase G) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4" />Agent Performance (24h)</h2>
          <div className="vanta-card p-4">
            {data.analytics.totalTraces === 0 ? (
              <p className="text-xs text-vanta-muted">No agent activity yet. Execute a goal to see traces.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-vanta-muted">{data.analytics.totalTraces} total traces</p>
                {Object.entries(data.analytics.byAgent).map(([name, stats]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{name}</span>
                    <span className="text-vanta-muted">{stats.count} runs · {stats.errors} errors · {stats.avgMs.toFixed(0)}ms avg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" />Learning</h2>
          <div className="vanta-card p-4">
            <p className="text-xs text-vanta-muted">{data.learning.lesson}</p>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-emerald-600">✅ {data.learning.positiveCount} successes</span>
              <span className="text-rose-600">❌ {data.learning.negativeCount} failures</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Failures (Phase G) */}
      {data.failures.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" />Recent Failures</h2>
          <div className="space-y-2">
            {data.failures.map((f) => (
              <div key={f.id} className="vanta-card p-3 border-rose-300 dark:border-rose-700">
                <p className="text-xs font-medium">{f.agentName}: {f.spanName}</p>
                <p className="text-[10px] text-vanta-muted mt-0.5">{f.errorMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color = "vanta" }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  const colors: Record<string, string> = { vanta: "text-vanta-600", amber: "text-amber-600", emerald: "text-emerald-600", rose: "text-rose-600" };
  return (
    <div className="vanta-card p-3">
      <div className={`${colors[color]} mb-1`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-vanta-muted">{label}</p>
    </div>
  );
}
