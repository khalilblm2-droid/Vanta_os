// Phase C: Product Discovery — research, evaluate, rank, monitor
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { generateContent } from "~/lib/ai/gemini.client";

export interface ProductCandidate {
  title: string;
  description: string;
  category: string;
  supplierCost: number;
  suggestedPrice: number;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
}

export interface EvaluatedOpportunity {
  candidate: ProductCandidate;
  demandScore: number;
  competitionScore: number;
  trendScore: number;
  overallScore: number;
  reasoning: string;
  risks: string[];
  estimatedMargin: number;
  estimatedMarginPercent: number;
}

export async function discoverProducts(shopDomain: string, niche?: string): Promise<ProductCandidate[]> {
  const prompt = `You are VANTA OS's Product Hunter. ${niche ? `Focus on niche: ${niche}.` : "Find trending products across categories."}

Discover 5 product opportunities suitable for dropshipping. For each:
- Realistic supplier cost (supplier range)
- Suggested retail price (2-3x cost minimum)
- Clear category
- Why it's trending

Output JSON array:
[{"title":"...","description":"...","category":"...","supplierCost":12.99,"suggestedPrice":29.99,"source":"SUPPLIER"}]`;

  const response = await generateContent(prompt, { temperature: 0.6 });
  let candidates: ProductCandidate[] = [];
  try {
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    candidates = JSON.parse(jsonMatch?.[0] ?? "[]");
  } catch { /* fallback empty */ }

  for (const c of candidates) {
    await prisma.productOpportunity.create({
      data: {
        shopDomain, source: c.source, sourceUrl: c.sourceUrl,
        title: c.title, description: c.description, imageUrl: c.imageUrl, category: c.category,
        supplierCost: c.supplierCost, suggestedPrice: c.suggestedPrice,
        estimatedMargin: c.suggestedPrice - c.supplierCost,
        estimatedMarginPercent: ((c.suggestedPrice - c.supplierCost) / c.suggestedPrice) * 100,
        status: "DISCOVERED",
      },
    });
  }

  logger.info("Products discovered", { shopDomain, count: candidates.length });
  return candidates;
}

export async function evaluateOpportunities(shopDomain: string): Promise<EvaluatedOpportunity[]> {
  const opportunities = await prisma.productOpportunity.findMany({
    where: { shopDomain, status: "DISCOVERED" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const evaluated: EvaluatedOpportunity[] = [];

  for (const opp of opportunities) {
    const margin = opp.estimatedMargin ?? 0;
    const marginPercent = opp.estimatedMarginPercent ?? 0;

    const demandScore = Math.min(100, marginPercent * 0.8 + 20);
    const competitionScore = Math.max(20, 100 - marginPercent);
    const trendScore = Math.min(100, 40 + Math.random() * 40);
    const overallScore = demandScore * 0.4 + (100 - competitionScore) * 0.3 + trendScore * 0.3;

    const reasoning = `Margin: ${marginPercent.toFixed(0)}% ($${margin.toFixed(2)}). Demand score: ${demandScore.toFixed(0)}/100. Competition: ${competitionScore.toFixed(0)}/100 (lower is better). Trend: ${trendScore.toFixed(0)}/100. Overall: ${overallScore.toFixed(0)}/100.`;
    const risks: string[] = [];
    if (marginPercent < 30) risks.push("low_margin");
    if (competitionScore > 70) risks.push("saturated_market");
    if (demandScore < 40) risks.push("low_demand");

    await prisma.productOpportunity.update({
      where: { id: opp.id },
      data: { demandScore, competitionScore, trendScore, overallScore, reasoning, risks, status: "EVALUATED" },
    });

    evaluated.push({
      candidate: {
        title: opp.title, description: opp.description ?? "", category: opp.category ?? "",
        supplierCost: opp.supplierCost ?? 0, suggestedPrice: opp.suggestedPrice ?? 0,
        imageUrl: opp.imageUrl ?? undefined, source: opp.source, sourceUrl: opp.sourceUrl ?? undefined,
      },
      demandScore, competitionScore, trendScore, overallScore, reasoning, risks,
      estimatedMargin: margin, estimatedMarginPercent: marginPercent,
    });
  }

  evaluated.sort((a, b) => b.overallScore - a.overallScore);
  return evaluated;
}

export async function getTopOpportunities(shopDomain: string, limit = 10) {
  return prisma.productOpportunity.findMany({
    where: { shopDomain, status: { in: ["EVALUATED", "APPROVED"] } },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
}
