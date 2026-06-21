// =============================================================================
// VANTA OS — Agency Multi-Store Dashboard (Section 72)
// Hidden route protected by AGENCY_SECRET environment variable.
// Lists all connected stores + plan status + last active task + Guardian alerts.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Building2 } from "lucide-react";
import { prisma } from "~/lib/db.server";
import { loadEnv } from "~/lib/env.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const e = loadEnv();
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e.AGENCY_SECRET}`;
  if (!e.AGENCY_SECRET || authHeader !== expected) {
    // Also support ?secret=... for browser access
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e.AGENCY_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shopDomain: true,
      name: true,
      plan: true,
      planStatus: true,
      creditsRemaining: true,
      creditsUsedCycle: true,
      installed: true,
      killSwitchEnabled: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          tasks: { where: { status: { in: ["QUEUED", "THINKING", "EXECUTING"] } } },
          guardianAlerts: { where: { resolved: false } },
        },
      },
    },
  });

  // For each shop, fetch last task
  const withLastTask = await Promise.all(
    shops.map(async (shop) => {
      const lastTask = await prisma.task.findFirst({
        where: { shopDomain: shop.shopDomain },
        orderBy: { createdAt: "desc" },
        select: { id: true, command: true, status: true, createdAt: true },
      });
      return {
        ...shop,
        lastTask: lastTask
          ? {
              id: lastTask.id,
              command: lastTask.command,
              status: lastTask.status,
              createdAt: lastTask.createdAt.toISOString(),
            }
          : null,
        activeTaskCount: shop._count.tasks,
        unresolvedAlerts: shop._count.guardianAlerts,
      };
    }),
  );

  return json({ shops: withLastTask });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function AgencyDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Agency Dashboard
        </h1>
        <p className="text-xs text-vanta-muted">{data.shops.length} connected stores</p>
      </div>

      <div className="overflow-x-auto vanta-card">
        <table className="w-full text-sm">
          <thead className="bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase tracking-wide text-vanta-muted">
            <tr>
              <th className="px-4 py-3 text-left">Store</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Credits</th>
              <th className="px-4 py-3 text-left">Active tasks</th>
              <th className="px-4 py-3 text-left">Guardian alerts</th>
              <th className="px-4 py-3 text-left">Last activity</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vanta-border">
            {data.shops.map((shop) => (
              <tr key={shop.id} className="hover:bg-vanta-50 dark:hover:bg-vanta-900/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{shop.name ?? shop.shopDomain}</p>
                  <p className="text-xs text-vanta-muted">{shop.shopDomain}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800">
                    {shop.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p>{shop.creditsRemaining} remaining</p>
                  <p className="text-vanta-muted">{shop.creditsUsedCycle} used</p>
                </td>
                <td className="px-4 py-3">
                  {shop.activeTaskCount > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-300">
                      {shop.activeTaskCount} active
                    </span>
                  ) : (
                    <span className="text-xs text-vanta-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {shop.unresolvedAlerts > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      {shop.unresolvedAlerts} alerts
                    </span>
                  ) : (
                    <span className="text-xs text-vanta-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-vanta-muted">
                  {shop.lastTask
                    ? formatRelativeTime(shop.lastTask.createdAt, "en")
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  {!shop.installed ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                      Uninstalled
                    </span>
                  ) : shop.killSwitchEnabled ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                      Kill switch on
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Healthy
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
