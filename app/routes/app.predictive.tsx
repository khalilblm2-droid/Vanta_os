// =============================================================================
// VANTA OS — Predictive Commerce Dashboard (2026)
// AI predicts demand, stockouts, and customer needs before they happen.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Brain, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { predictDemand, type DemandPrediction } from "~/lib/ai/advanced/predictive-commerce";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  let predictions: DemandPrediction[] = [];
  try {
    predictions = await predictDemand(ctx.admin, ctx.shopDomain);
  } catch (err) {
    // Graceful degradation — show empty state if Shopify API fails
  }
  return json({
    locale: ctx.shop.preferredLanguage as Locale,
    predictions,
    totalProducts: predictions.length,
    criticalCount: predictions.filter((p) => p.stockoutRisk === "CRITICAL").length,
    highCount: predictions.filter((p) => p.stockoutRisk === "HIGH").length,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function PredictiveDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Predictive Commerce
        </h1>
        <p className="text-sm text-vanta-muted mt-1">
          الذكاء الاصطناعي كيتوقع الطلب، مخاطر نفاد المخزون، واحتياجات الزبناء قبل ما تحصل.
        </p>
      </div>

      <div className="vanta-card p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <p className="text-sm">
          🔮 <strong>2026 AI:</strong> هاد التوقعات مبنية على تحليل أنماط الطلب، الموسمية، والاتجاهات.
          النظام كيتعلم من كل طلب وكيحسّن دقته مع الوقت.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="vanta-card p-4">
          <Package className="h-5 w-5 text-vanta-500 mb-1" />
          <p className="text-2xl font-bold">{data.totalProducts}</p>
          <p className="text-xs text-vanta-muted">Products analyzed</p>
        </div>
        <div className="vanta-card p-4 border-rose-300 dark:border-rose-700">
          <AlertTriangle className="h-5 w-5 text-rose-500 mb-1" />
          <p className="text-2xl font-bold text-rose-600">{data.criticalCount}</p>
          <p className="text-xs text-vanta-muted">Critical stockout risk</p>
        </div>
        <div className="vanta-card p-4 border-amber-300 dark:border-amber-700">
          <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-amber-600">{data.highCount}</p>
          <p className="text-xs text-vanta-muted">High stockout risk</p>
        </div>
        <div className="vanta-card p-4">
          <TrendingUp className="h-5 w-5 text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-emerald-600">{data.totalProducts - data.criticalCount - data.highCount}</p>
          <p className="text-xs text-vanta-muted">Healthy inventory</p>
        </div>
      </div>

      {/* Predictions table */}
      {data.predictions.length === 0 ? (
        <div className="vanta-card p-10 text-center">
          <Brain className="h-10 w-10 text-vanta-muted mx-auto mb-3" />
          <p className="text-sm text-vanta-muted">
            جاري تحليل منتجاتك... عاود تحميل الصفحة بعد دقيقة.
          </p>
        </div>
      ) : (
        <div className="vanta-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase text-vanta-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Stock</th>
                  <th className="px-4 py-2 text-right">7d Demand</th>
                  <th className="px-4 py-2 text-right">30d Demand</th>
                  <th className="px-4 py-2 text-center">Risk</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vanta-border">
                {data.predictions.slice(0, 30).map((p) => (
                  <tr key={p.productId} className="hover:bg-vanta-50 dark:hover:bg-vanta-900/20">
                    <td className="px-4 py-2 truncate max-w-[200px]">{p.title}</td>
                    <td className="px-4 py-2 text-right">{p.currentStock}</td>
                    <td className="px-4 py-2 text-right">{p.predictedDemand7d}</td>
                    <td className="px-4 py-2 text-right">{p.predictedDemand30d}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        p.stockoutRisk === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                        p.stockoutRisk === "HIGH" ? "bg-amber-100 text-amber-700" :
                        p.stockoutRisk === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {p.stockoutRisk}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-xs">{p.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
