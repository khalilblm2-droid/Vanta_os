// VANTA OS — Goals Dashboard (Phase A: Goal Execution Engine UI)
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Target, Play, Plus, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { createGoal, generatePlan, executePlan } from "~/lib/ai/autonomous/goal-engine";
import { useToast } from "~/components/ui/Toaster";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const goals = await prisma.goal.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { plans: { orderBy: { version: "desc" }, take: 1, select: { id: true, status: true, version: true, totalSteps: true, completedSteps: true } } },
  });
  return json({
    shopId: ctx.shop.id,
    shopDomain: ctx.shopDomain,
    staffId: ctx.staffId,
    goals: goals.map((g) => ({
      id: g.id, title: g.title, description: g.description, status: g.status, priority: g.priority,
      progress: g.progress, totalSteps: g.totalSteps, completedSteps: g.completedSteps, failedSteps: g.failedSteps,
      autonomyLevel: g.autonomyLevel, riskScore: g.riskScore,
      latestPlan: g.plans[0] ? { id: g.plans[0].id, status: g.plans[0].status, version: g.plans[0].version, totalSteps: g.plans[0].totalSteps, completedSteps: g.plans[0].completedSteps } : null,
      createdAt: g.createdAt.toISOString(),
    })),
  });
}

export function headers(_: HeadersArgs) { return getSecurityHeaders(); }

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();

  if (body.action === "create_goal") {
    const goal = await createGoal({
      shopDomain: ctx.shopDomain, shopId: ctx.shop.id, staffId: ctx.staffId,
      title: body.title, description: body.description,
      successCriteria: body.successCriteria, priority: body.priority,
      autonomyLevel: body.autonomyLevel,
    });
    await generatePlan(goal.id);
    return json({ ok: true, goalId: goal.id });
  }

  if (body.action === "execute_plan") {
    const result = await executePlan(body.planId);
    return json({ ok: true, ...result });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function GoalsDashboard() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [autonomy, setAutonomy] = useState("ASSISTED");

  const createAndPlan = async () => {
    if (!title.trim() || !description.trim()) return;
    fetcher.submit({ action: "create_goal", title, description, autonomyLevel: autonomy, priority: "NORMAL" }, { method: "post", encType: "application/json" });
    toast.success("Goal created", "AI is planning the execution steps...");
    setShowForm(false); setTitle(""); setDescription("");
  };

  const execute = (planId: string) => {
    fetcher.submit({ action: "execute_plan", planId }, { method: "post", encType: "application/json" });
    toast.info("Executing plan", "Steps are running in the background");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" />Goals &amp; Plans</h1>
          <p className="text-sm text-vanta-muted mt-1">Set high-level goals. AI plans the steps, executes them, and self-heals on failure.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New Goal
        </button>
      </div>

      {showForm && (
        <div className="vanta-card p-5 space-y-3">
          <div><label className="text-xs text-vanta-muted">Goal title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build my dropshipping business" className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500" /></div>
          <div><label className="text-xs text-vanta-muted">Describe what you want</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="I want to build and grow my Shopify store automatically." className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500" /></div>
          <div>
            <label className="text-xs text-vanta-muted">Autonomy level</label>
            <select value={autonomy} onChange={(e) => setAutonomy(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm">
              <option value="ASSISTED">Assisted — ask me before each step</option>
              <option value="SUPERVISED">Supervised — ask only for risky actions</option>
              <option value="AUTONOMOUS">Autonomous — execute everything automatically</option>
            </select>
          </div>
          <button onClick={createAndPlan} disabled={!title.trim() || !description.trim()} className="px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 disabled:opacity-50">Create &amp; Plan</button>
        </div>
      )}

      {data.goals.length === 0 ? (
        <div className="vanta-card p-10 text-center">
          <Target className="h-10 w-10 text-vanta-muted mx-auto mb-3" />
          <p className="text-sm text-vanta-muted">No goals yet. Create one above — AI will plan and execute it for you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.goals.map((goal) => (
            <div key={goal.id} className="vanta-card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-sm">{goal.title}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${goal.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : goal.status === "ACTIVE" ? "bg-vanta-100 text-vanta-700" : goal.status === "FAILED" ? "bg-rose-100 text-rose-700" : "bg-vanta-100 text-vanta-muted"}`}>{goal.status}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{goal.autonomyLevel}</span>
                  </div>
                  <p className="text-xs text-vanta-muted mt-1 line-clamp-2">{goal.description}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-vanta-muted">{goal.completedSteps}/{goal.totalSteps} steps</span>
                  <span className="text-vanta-muted">{(goal.progress * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-vanta-100 dark:bg-vanta-800 rounded-full overflow-hidden">
                  <div className="h-full bg-vanta-500 transition-all" style={{ width: `${goal.progress * 100}%` }} />
                </div>
              </div>

              {/* Plan status + execute button */}
              {goal.latestPlan && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-vanta-muted">
                    <span>Plan v{goal.latestPlan.version}</span>
                    <span>•</span>
                    <span>{goal.latestPlan.status}</span>
                    {goal.failedSteps > 0 && (<><span>•</span><span className="text-rose-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{goal.failedSteps} failed</span></>)}
                  </div>
                  {goal.latestPlan.status === "APPROVED" && (
                    <button onClick={() => execute(goal.latestPlan!.id)} className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1">
                      <Play className="h-3 w-3" />Execute
                    </button>
                  )}
                  {goal.latestPlan.status === "DRAFT" && (
                    <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" />Awaiting approval</span>
                  )}
                  {goal.latestPlan.status === "COMPLETED" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              )}

              <p className="text-[10px] text-vanta-muted mt-2">Created {formatRelativeTime(goal.createdAt, "en")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
