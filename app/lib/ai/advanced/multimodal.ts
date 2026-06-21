// =============================================================================
// VANTA OS — Multi-Modal AI Engine (2026)
// Processes text, voice, image, AND video simultaneously.
// Customers can: speak, upload photos, take screenshots, or send video.
// =============================================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecret } from "~/lib/security/secrets-vault";
import { logger } from "~/lib/logger.server";

export type Modality = "text" | "voice" | "image" | "video";

export interface MultiModalInput {
  text?: string;
  voiceBase64?: string; // base64 audio
  imageBase64?: string; // base64 image
  videoBase64?: string; // base64 video (short clip)
}

export interface MultiModalResult {
  interpretation: string;
  intent: string;
  confidence: number;
  extractedEntities: Record<string, string>;
  suggestedActions: string[];
  modalityUsed: Modality[];
}

let _model: any = null;

async function getModel() {
  if (_model) return _model;
  const client = new GoogleGenerativeAI(getSecret("GEMINI_API_KEY"));
  _model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  return _model;
}

/**
 * Process multi-modal input — the AI sees/hears/reads everything at once.
 */
export async function processMultiModal(input: MultiModalInput): Promise<MultiModalResult> {
  const model = await getModel();
  const parts: any[] = [];

  const modalities: Modality[] = [];
  if (input.text) {
    parts.push({ text: input.text });
    modalities.push("text");
  }
  if (input.imageBase64) {
    const [mime, data] = input.imageBase64.match(/data:([^;]+);base64,(.+)/)?.slice(1) ?? ["image/jpeg", input.imageBase64];
    parts.push({ inlineData: { mimeType: mime, data } });
    modalities.push("image");
  }
  if (input.voiceBase64) {
    parts.push({ inlineData: { mimeType: "audio/mp3", data: input.voiceBase64 } });
    modalities.push("voice");
  }
  if (input.videoBase64) {
    parts.push({ inlineData: { mimeType: "video/mp4", data: input.videoBase64 } });
    modalities.push("video");
  }

  const prompt = `Analyze this multi-modal input from a Shopify merchant/customer.
Determine their intent, extract key entities, and suggest actions.

Output JSON:
{
  "interpretation": "<what they want>",
  "intent": "<find_product | update_price | ask_question | report_issue | other>",
  "confidence": <0-1>,
  "extractedEntities": { "product": "...", "price": "...", "category": "..." },
  "suggestedActions": ["<action 1>", "<action 2>"]
}`;

  parts.push({ text: prompt });

  try {
    const result = await model.generateContent(parts);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, modalityUsed: modalities };
    }
  } catch (err) {
    logger.error("Multi-modal AI failed", { error: String(err) });
  }

  return {
    interpretation: "Could not process input",
    intent: "unknown",
    confidence: 0,
    extractedEntities: {},
    suggestedActions: [],
    modalityUsed: modalities,
  };
}
