// VANTA OS — Browser Agent Dashboard (Phase 3 UI)
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Globe, Play, CheckCircle2, Clock } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { useToast } from "~/components/ui/Toaster";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const { getBrowserWorkflows } = await import("~/lib/ai/agents/browser-agent.server");
  const { listConnectedAccounts } = await import("~/lib/ai/agents/connected-accounts.server");
  const [workflows, accounts, sessions] = await Promise.all([
    getBrowserWorkflows(ctx.shopDomain),
    listConnectedAccounts(ctx.shopDomain),
    prisma.browserSession.findMany({ where: shopScoped(ctx.shopDomain), orderBy: { startedAt: "desc" }, take: 10 }),
  ]);
  return json({
    shopDomain: ctx.shopDomain, staffId: ctx.staffId,
    workflows: workflows.map((w) => ({
      id: w.id, name: w.name, description: w.description, status: w.status,
      currentStep: w.currentStep, totalSteps: (w.steps as unknown[]).length,
      requiresApproval: w.requiresApproval, approvedBy: w.approvedBy,
      connectedAccount: w.connectedAccount ? `${w.connectedAccount.accountType}: ${w.connectedAccount.accountName}` : null,
      actionCount: w._count.actions, createdAt: w.createdAt.toISOString(), completedAt: w.completedAt?.toISOString() ?? null,
    })),
    accounts, sessions: sessions.map((s) => ({ id: s.id, status: s.status, currentUrl: s.currentUrl, startedAt: s.startedAt.toISOString() })),
  });
}

export function headers(_: HeadersArgs) { return getSecurityHeaders(); }

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { approveBrowserWorkflow, executeBrowserWorkflow, createBrowserWorkflow } = await import("~/lib/ai/agents/browser-agent.server");

  if (body.action === "approve") { await approveBrowserWorkflow(ctx.shopDomain, body.workflowId, ctx.staffId); return json({ ok: true }); }
  if (body.action === "execute") { const result = await executeBrowserWorkflow(body.workflowId, ctx.staffId); return json(result); }
  if (body.action === "create_research") {
    const steps = [
      { id: "1", action: "NAVIGATE", target: body.url ?? "https://example.com", description: "Navigate to target URL", riskLevel: "LOW" },
      { id: "2", action: "INPUT", target: "input#search-key", value: body.query ?? "trending products 2026", description: "Search for products", riskLevel: "LOW" },
      { id: "3", action: "CLICK", target: "button.search-button", description: "Submit search", riskLevel: "LOW" },
      { id: "4", action: "WAIT", waitFor: ".product-item", description: "Wait for results", riskLevel: "LOW" },
      { id: "5", action: "EXTRACT", target: ".product-item .title", description: "Extract product titles", riskLevel: "LOW", screenshot: true },
      { id: "6", action: "SCREENSHOT", description: "Capture page", riskLevel: "LOW", screenshot: true },
    ];
    const id = await createBrowserWorkflow({ shopDomain: ctx.shopDomain, name: `Research: ${body.query ?? "products"}`, description: `Browser-based research for: ${body.query ?? "trending products"}`, steps: steps as any, requiresApproval: true });
    return json({ ok: true, workflowId: id });
  }
  return json({ error: "Unknown" }, { status: 400 });
}

export default function BrowserAgentDashboard() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();

  const approve = (id: string) => { fetcher.submit({ action: "approve", workflowId: id }, { method: "post", encType: "application/json" }); toast.success("Approved", "Workflow can now be executed."); };
  const execute = (id: string) => { fetcher.submit({ action: "execute", workflowId: id }, { method: "post", encType: "application/json" }); toast.info("Executing", "Browser steps running in background..."); };
  const createResearch = () => { fetcher.submit({ action: "create_research", query: "trending products 2026" }, { method: "post", encType: "application/json" }); toast.success("Workflow created", "Review and approve before execution."); };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" />Browser Agent</h1>
        <p className="text-sm text-vanta-muted mt-1">Merchant-authorized browser automation. The Browser Agent is a tool of the AI agent system — it never acts on its own.</p>
      </div>
      <div className="vanta-card p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700">
        <p className="text-xs">🔒 <strong>Subordinate to agents:</strong> The Browser Agent only executes when instructed by Planner, Research, Analyst, or Reviewer agents. Every action is logged with screenshots. Sensitive actions require your approval.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="vanta-card p-3"><Globe className="h-4 w-4 text-vanta-500 mb-1" /><p className="text-2xl font-bold">{data.workflows.length}</p><p className="text-xs text-vanta-muted">Workflows</p></div>
        <div className="vanta-card p-3"><Clock className="h-4 w-4 text-amber-500 mb-1" /><p className="text-2xl font-bold text-amber-600">{data.workflows.filter((w) => w.status === "AWAITING_APPROVAL").length}</p><p className="text-xs text-vanta-muted">Awaiting approval</p></div>
        <div className="vanta-card p-3"><CheckCircle2 className="h-4 w-4 text-emerald-500 mb-1" /><p className="text-2xl font-bold text-emerald-600">{data.workflows.filter((w) => w.status === "COMPLETED").length}</p><p className="text-xs text-vanta-muted">Completed</p></div>
      </div>
      <button onClick={createResearch} className="px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700">+ Create Research Workflow</button>
      {data.accounts.length === 0 && (<div className="vanta-card p-4 border-amber-300 dark:border-amber-700"><p className="text-xs text-amber-700 dark:text-amber-300">⚠️ No connected accounts. The Browser Agent needs merchant-owned API accounts to operate. <a href="/app/connected-accounts" className="underline ml-1">Connect an account →</a></p></div>)}
      {data.workflows.length === 0 ? (
        <div className="vanta-card p-10 text-center"><Globe className="h-10 w-10 text-vanta-muted mx-auto mb-3" /><p className="text-sm text-vanta-muted">No browser workflows yet. Create one above or let an agent plan one.</p></div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Workflows</h2>
          {data.workflows.map((wf) => (
            <div key={wf.id} className="vanta-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{wf.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${wf.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : wf.status === "AWAITING_APPROVAL" ? "bg-amber-100 text-amber-700" : wf.status === "FAILED" ? "bg-rose-100 text-rose-700" : wf.status === "RUNNING" ? "bg-blue-100 text-blue-700" : "bg-vanta-100 text-vanta-muted"}`}>{wf.status}</span>
                  </div>
                  {wf.description && <p className="text-xs text-vanta-muted mt-1 line-clamp-1">{wf.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-vanta-muted mt-1">
                    <span>{wf.currentStep}/{wf.totalSteps} steps</span>{wf.connectedAccount && <span>• {wf.connectedAccount}</span>}<span>• {wf.actionCount} actions</span><span>• {formatRelativeTime(wf.createdAt, "en")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {wf.status === "AWAITING_APPROVAL" && <button onClick={() => approve(wf.id)} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>}
                  {wf.status === "PENDING" && (wf.approvedBy || !wf.requiresApproval) && <button onClick={() => execute(wf.id)} className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1"><Play className="h-3 w-3" />Execute</button>}
                  {wf.status === "RUNNING" && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                  {wf.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
