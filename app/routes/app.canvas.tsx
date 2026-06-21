// =============================================================================
// VANTA OS — Agent Canvas Route (Section 9.3)
// Wraps the AgentCanvas component with server-loaded initial tasks + explicit
// /api/tasks submission logic (Section 10).
// =============================================================================

import { useCallback } from "react";
import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AgentCanvas } from "~/components/AgentCanvas";
import type { TaskData } from "~/components/TaskCard";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import type { Locale } from "~/lib/i18n/useTranslation";
import { useToast } from "~/components/ui/Toaster";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const tasks = await prisma.task.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } },
    },
  });

  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage as Locale,
    initialTasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      output: t.output ?? undefined,
      errorMessage: t.errorMessage ?? undefined,
      confidenceScore: t.confidenceScore ?? undefined,
      blastRadius: t.blastRadius,
      requiresApproval: t.requiresApproval,
      initiatedByStaffName: t.staff?.name ?? undefined,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      undoable: t._count.undoSnapshots > 0 && t.status === "COMPLETED",
    })),
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function CanvasRoute() {
  const data = useLoaderData<typeof loader>();
  const toast = useToast();

  // معالج onSubmit صريح — يتواصل مع /api/tasks مباشرة
  const handleSubmit = useCallback(
    async (input: { command: string; priority: TaskData["priority"]; language: string }): Promise<TaskData | null> => {
      try {
        // استخدام fetcher.submit للتواصل مع /api/tasks
        const formData = new FormData();
        formData.append("command", input.command);
        formData.append("priority", input.priority);
        formData.append("language", input.language);

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: input.command,
            priority: input.priority,
            language: input.language,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || errorData.error || `HTTP ${response.status}`;

          if (response.status === 429) {
            toast.warning("Rate limited", "بطيء شوية — عاود جرّب بعد دقيقة");
          } else if (response.status === 403) {
            toast.error("Kill switch مفعّل", "الأجينت معطّل من الإعدادات");
          } else if (response.status === 409) {
            toast.warning("مهمة مكررة", "هذا الأمر كيخدم ديجا");
          } else {
            toast.error("خطأ", message);
          }
          return null;
        }

        const result = (await response.json()) as {
          id: string;
          command: string;
          status: TaskData["status"];
          priority: TaskData["priority"];
          createdAt: string;
        };

        toast.success("تم!", "المهمة تصيفطات للأجينت");

        // إرجاع TaskData كامل للإضافة الفورية للقائمة (optimistic UI)
        return {
          id: result.id,
          command: result.command,
          status: result.status,
          priority: result.priority,
          createdAt: result.createdAt,
        };
      } catch (err) {
        toast.error("خطأ شبكي", err instanceof Error ? err.message : "تعذّر الاتصال بالخادم");
        return null;
      }
    },
    [toast],
  );

  return (
    <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)]">
      <AgentCanvas
        locale={data.locale}
        shopDomain={data.shopDomain}
        initialTasks={data.initialTasks}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
