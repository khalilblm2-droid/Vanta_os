// Phase B: Multi-Agent System — 7 specialized agents that collaborate
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { generateContent } from "~/lib/ai/gemini.client";

export interface AgentDefinition {
  name: string;
  role: string;
  systemPrompt: string;
  capabilities: string[];
  temperature: number;
}

export const SPECIALIZED_AGENTS: Record<string, AgentDefinition> = {
  planner: {
    name: "planner",
    role: "Planner Agent",
    systemPrompt: "You are VANTA OS's Planner. You decompose high-level goals into multi-step execution plans. You think about dependencies, risks, and optimal ordering. You always output structured JSON plans.",
    capabilities: ["goal_decomposition", "risk_assessment", "dependency_mapping", "resource_estimation"],
    temperature: 0.3,
  },
  research: {
    name: "research",
    role: "Research Agent",
    systemPrompt: "You are VANTA OS's Research Agent. You gather information about markets, products, competitors, and trends. You use web search and store data to build comprehensive reports. You cite sources and quantify confidence.",
    capabilities: ["market_research", "competitor_analysis", "trend_monitoring", "data_gathering"],
    temperature: 0.4,
  },
  product_hunter: {
    name: "product_hunter",
    role: "Product Hunter Agent",
    systemPrompt: "You are VANTA OS's Product Hunter. You discover winning products by analyzing trends, margins, competition, and demand signals. You evaluate opportunities and rank them by overall score. You always explain your reasoning.",
    capabilities: ["product_discovery", "opportunity_evaluation", "margin_analysis", "trend_matching"],
    temperature: 0.5,
  },
  store_optimizer: {
    name: "store_optimizer",
    role: "Store Optimizer Agent",
    systemPrompt: "You are VANTA OS's Store Optimizer. You improve store performance by optimizing collections, SEO, product descriptions, and layout. You A/B test changes and track their impact on conversion.",
    capabilities: ["seo_optimization", "collection_management", "description_generation", "conversion_optimization"],
    temperature: 0.5,
  },
  marketing: {
    name: "marketing",
    role: "Marketing Agent",
    systemPrompt: "You are VANTA OS's Marketing Agent. You create marketing content: email campaigns, social media posts, ad copy, and product descriptions. You match brand voice and optimize for engagement.",
    capabilities: ["content_creation", "email_campaigns", "social_media", "ad_copy"],
    temperature: 0.7,
  },
  analyst: {
    name: "analyst",
    role: "Analyst Agent",
    systemPrompt: "You are VANTA OS's Analyst. You analyze store data: sales trends, customer behavior, inventory metrics, and financial performance. You produce insights and recommendations backed by data.",
    capabilities: ["data_analysis", "trend_identification", "performance_reporting", "anomaly_detection"],
    temperature: 0.2,
  },
  reviewer: {
    name: "reviewer",
    role: "Reviewer Agent",
    systemPrompt: "You are VANTA OS's Reviewer. You review other agents' proposed actions before execution. You check for safety, correctness, and alignment with the merchant's goals. You can approve, modify, or reject actions.",
    capabilities: ["action_review", "safety_checking", "quality_assurance", "goal_alignment"],
    temperature: 0.2,
  },
};

export interface AgentMessage {
  fromAgent: string;
  toAgent: string;
  messageType: "REQUEST" | "RESPONSE" | "FINDING" | "QUESTION" | "HANDOFF";
  content: string;
  metadata?: Record<string, unknown>;
}

export async function sendAgentMessage(shopDomain: string, msg: AgentMessage, goalId?: string): Promise<void> {
  await prisma.agentMessage.create({
    data: { shopDomain, goalId, fromAgent: msg.fromAgent, toAgent: msg.toAgent, messageType: msg.messageType, content: msg.content, metadata: msg.metadata },
  });
  logger.debug("Agent message", { from: msg.fromAgent, to: msg.toAgent, type: msg.messageType });
}

export async function getAgentMessages(shopDomain: string, agentName: string, limit = 20): Promise<AgentMessage[]> {
  const msgs = await prisma.agentMessage.findMany({
    where: { shopDomain, OR: [{ toAgent: agentName }, { toAgent: "broadcast" }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return msgs.map((m) => ({ fromAgent: m.fromAgent, toAgent: m.toAgent, messageType: m.messageType as AgentMessage["messageType"], content: m.content, metadata: m.metadata as Record<string, unknown> | undefined }));
}

export async function runAgent(agentName: string, shopDomain: string, input: { goal: string; context?: string }): Promise<{ output: string; confidence: number }> {
  const agent = SPECIALIZED_AGENTS[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);

  const prompt = `${input.context ? `Context: ${input.context}\n\n` : ""}Task: ${input.goal}\n\nProvide your response as a specialist in: ${agent.role}. Be specific and actionable.`;
  const response = await generateContent(prompt, { systemInstruction: agent.systemPrompt, temperature: agent.temperature });

  return { output: response.text, confidence: 0.75 };
}

export function listSpecializedAgents(): AgentDefinition[] {
  return Object.values(SPECIALIZED_AGENTS);
}
