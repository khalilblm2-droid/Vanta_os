// =============================================================================
// VANTA OS — Autonomous Agents Dashboard (2026 Trillion-Dollar Feature)
// Shows 7 autonomous AI agents that run 24/7 without human intervention.
// =============================================================================

import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Bot, Play, Pause, TrendingUp, Shield, DollarSign, Search, Users, Activity } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { listAutonomousAgents, type AutonomousAgent } from "~/lib/ai/advanced/autonomous-agents";
import { useToast } from "~/components/ui/Toaster";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  "inventory-guardian": <Shield className="h-5 w-5" />,
  "price-optimizer": <DollarSign className="h-5 w-5" />,
  "seo-enhancer": <Search className="h-5 w-5" />,
  "customer-retention": <Users className="h-5 w-5" />,
  "fraud-monitor": <Activity className="h-5 w-5" />,
  "trend-scout": <TrendingUp className="h-5 w-5" />,
  "ab-test-manager": <Activity className="h-5 w-5" />,
};

export async function loader(args: LoaderFunctionArgs) {
  await requireAdmin(args);
  const agents = listAutonomousAgents();
  return json({ agents });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { runAutonomousAgent } = await import("~/lib/ai/advanced/autonomous-agents");
  const result = await runAutonomousAgent(ctx.shopDomain, body.agentId);
  return json(result);
}

export default function AgentsDashboard() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();

  const runAgent = (agentId: string, name: string) => {
    fetcher.submit({ agentId }, { method: "post", encType: "application/json" });
    toast.info(`تشغيل ${name}...`, "الأجينت بدأ العمل");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Autonomous AI Agents
        </h1>
        <p className="text-sm text-vanta-muted mt-1">
          7 وكلاء ذكاء اصطناعي يعملون 24/7 بدون تدخل بشري. كل واحد عنده هدف وقرارات مستقلة.
        </p>
      </div>

      <div className="vanta-card p-4 bg-gradient-to-r from-vanta-50 to-purple-50 dark:from-vanta-900/40 dark:to-purple-900/20">
        <p className="text-sm">
          🔮 <strong>2026 Technology:</strong> هاد الوكلاء كيتفكرو، كيقررو، وكيتنفذو بلا ما حد يقولهم.
          كيتفحصو المتجر كل ساعات، كيحللو الأنماط، وكيخدو قرارات قابلة للتراجع.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.agents.map((agent) => (
          <div key={agent.id} className="vanta-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-vanta-100 dark:bg-vanta-800 text-vanta-600 dark:text-vanta-300">
                  {AGENT_ICONS[agent.id] ?? <Bot className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{agent.name}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${agent.status === "RUNNING" ? "bg-emerald-100 text-emerald-700" : "bg-vanta-100 text-vanta-muted"}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => runAgent(agent.id, agent.name)}
                disabled={agent.status === "RUNNING"}
                className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                Run
              </button>
            </div>
            <p className="text-xs text-vanta-muted mb-3">{agent.goal}</p>
            <div className="flex items-center gap-4 text-[10px] text-vanta-muted">
              <span>📅 {agent.schedule}</span>
              <span>🎯 {agent.decisions} decisions</span>
              <span>⚡ {agent.actionsTaken} actions</span>
            </div>
            {agent.lastRun && (
              <p className="text-[10px] text-vanta-muted mt-2">Last: {new Date(agent.lastRun).toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
