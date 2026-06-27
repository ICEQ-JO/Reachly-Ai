import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CampaignBrief, DistributionPlan, ContentPlan, ContentPiece } from "@/lib/b2c/types";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const model = openrouter("openai/gpt-4o-mini");

export interface ProductInfo {
  name: string;
  description?: string | null;
  type?: string | null;
  audience?: string | null;
  scope?: string[] | null;
  targetTitles?: string[] | null;
  targetIndustry?: string | null;
  targetSizes?: string[] | null;
  keywords?: string[] | null;
  painPoint?: string | null;
  differentiator?: string | null;
  targetCustomer?: string | null;
  niche?: string | null;
  offering?: string | null;
  tone?: string | null;
  appType?: string | null;
  goals?: string[] | null;
  intensity?: string | null;
}

export interface LeadInfo {
  name?: string | null;
  title?: string | null;
  company?: string | null;
  email?: string | null;
}

export async function classifyProduct(product: ProductInfo) {
  const { text } = await generateText({
    model,
    system: "You are a growth marketing expert. Classify products and suggest optimal GTM strategies. Always respond with valid JSON only.",
    prompt: `Classify this ${product.audience?.toUpperCase() ?? "B2B"} product and suggest a growth strategy:

Product: ${product.name}
Description: ${product.description ?? "N/A"}
Type: ${product.type ?? "SaaS"}
Audience: ${product.audience ?? "b2b"}
Scope: ${product.scope?.join(", ") ?? "global"}

Respond with JSON:
{
  "tier": "startup|growth|enterprise",
  "persona": "brief ICP description",
  "primaryChannel": "best channel name",
  "channels": ["channel1", "channel2"],
  "positioning": "one-line positioning statement",
  "urgency": "low|medium|high"
}`,
  });

  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { tier: "startup", persona: "Product owner", primaryChannel: "cold-email", channels: [], positioning: product.name, urgency: "medium" };
  }
}

export async function generateContent(opts: {
  channel: string;
  product: ProductInfo;
  lead?: LeadInfo | null;
  extra?: Record<string, string> | null;
}): Promise<{ subject?: string; body: string }> {
  const { channel, product, lead, extra } = opts;

  // Build strategy context string from extra campaign settings
  let strategyCtx = "";
  if (extra && Object.keys(extra).length > 0) {
    const parts = Object.entries(extra).map(([k, v]) => `${k}: ${v}`);
    strategyCtx = `\nCampaign strategy & requirements:\n${parts.map(p => `- ${p}`).join("\n")}`;
  }

  const prompts: Record<string, string> = {
    "cold-email": `Write a personalized cold email for:
Lead: ${lead?.name ?? "Decision Maker"} at ${lead?.company ?? "their company"} (${lead?.title ?? "their role"})
Product: ${product.name} — ${product.description ?? ""}
Pain point solved: ${product.painPoint ?? "productivity and growth"}
Differentiator: ${product.differentiator ?? "AI-powered automation"}

Return JSON: { "subject": "email subject line", "body": "email body with personalization, 3 short paragraphs, CTA at end" }`,

    "linkedin": `Write a LinkedIn post to promote ${product.name} (${product.description ?? ""}).
Target: ${product.targetIndustry ?? "tech"} industry, ${product.targetTitles?.join(", ") ?? "founders and product managers"}.
Tone: professional but engaging. Include a hook, insight, and CTA.
Max 300 words. Use line breaks for readability.

Return JSON: { "body": "linkedin post text" }`,

    "instagram": `Write an Instagram caption for ${product.name} (${product.description ?? ""}).
Target: ${product.targetCustomer ?? "entrepreneurs and makers"}.
Niche: ${product.niche ?? "tech/productivity"}.
Tone: ${product.tone ?? "casual and inspiring"}.${strategyCtx}
Include relevant hashtags at end. Make it engaging and on-brand.

Return JSON: { "body": "instagram caption with hashtags" }`,

    "reddit": `Write a Reddit post promoting ${product.name} without being spammy.
Subreddit style: value-first, share a story or insight, mention the product naturally.
Product: ${product.description ?? product.name}
Target community: ${product.niche ?? "productivity/tools"} subreddit users.${strategyCtx}
Include a compelling title and detailed body.

Return JSON: { "subject": "reddit post title", "body": "reddit post body" }`,

    "facebook": `Write a Facebook post for ${product.name}.
Target: ${product.targetCustomer ?? "business owners and entrepreneurs"}.
Tone: ${product.tone ?? "friendly and relatable"}.${strategyCtx}
Highlight the main benefit. Include a question to drive engagement. Max 200 words.

Return JSON: { "body": "facebook post text" }`,
  };

  const prompt = prompts[channel] ?? prompts["cold-email"];

  const { text } = await generateText({
    model,
    system: "You are an expert copywriter specializing in growth marketing. Respond with valid JSON only.",
    prompt,
  });

  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { body: text };
  }
}

/**
 * One-shot B2C marketing plan: a SINGLE LLM call that produces a cohesive
 * ContentPlan + one ContentPiece per distribution slot (what & why). Platforms are
 * taken authoritatively from the deterministic plan; on any parse failure we fall
 * back to per-slot generateContent() so the pipeline never hard-fails.
 */
export async function generateB2cContentPlan(brief: CampaignBrief, plan: DistributionPlan): Promise<ContentPlan> {
  const slotList = plan.slots
    .map((s, i) => `${i + 1}. ${s.platform} — scheduled ${s.scheduledDay} ${s.scheduledTime}`)
    .join("\n");

  const prompt = `Create ONE cohesive social content plan for this brand, then write every post.

BRAND
Name: ${brief.productName}
Description: ${brief.description}
Niche: ${brief.niche || "n/a"}
Offering: ${brief.offering || "n/a"}
Target customer: ${brief.targetCustomer || "general consumers"}
Tone: ${brief.tone || "casual and engaging"}
Keywords: ${(brief.keywords || []).join(", ") || "n/a"}

POSTING SCHEDULE — write exactly one post per line, in this order:
${slotList}

Rules:
- Platform-native copy: Instagram = punchy caption + hashtags; Facebook = friendly + a question; Reddit = value-first, non-spammy, with a title.
- Each post needs a one-sentence "rationale" (why this post, this channel, advances the plan).
- "imageQuery" = 2-4 words to find a relevant photo.

Return ONLY JSON:
{
  "theme": "the campaign through-line",
  "summary": "2-sentence strategy summary",
  "pieces": [
    { "platform": "instagram|facebook|reddit", "body": "...", "subject": "reddit title or empty", "hashtags": "#a #b or empty", "rationale": "...", "imageQuery": "..." }
  ]
}
"pieces" MUST have exactly ${plan.slots.length} items, one per scheduled line, same order.`;

  try {
    const { text } = await generateText({
      model,
      system: "You are an expert social media strategist and copywriter. Respond with valid JSON only.",
      prompt,
    });
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean) as ContentPlan;
    if (!Array.isArray(parsed.pieces) || parsed.pieces.length === 0) throw new Error("empty pieces");

    const pieces: ContentPiece[] = plan.slots.map((slot, i) => {
      const p = parsed.pieces[i] ?? parsed.pieces[parsed.pieces.length - 1];
      return {
        platform: slot.platform, // plan is authoritative for where
        body: p?.body ?? "",
        subject: p?.subject || undefined,
        hashtags: p?.hashtags || undefined,
        rationale: p?.rationale ?? "",
        imageQuery: p?.imageQuery || brief.niche || brief.productName,
      };
    });
    return { theme: parsed.theme ?? brief.productName, summary: parsed.summary ?? "", pieces };
  } catch {
    // Fallback: per-slot generation with the existing single-post generator.
    const product: ProductInfo = {
      name: brief.productName, description: brief.description, niche: brief.niche,
      offering: brief.offering, tone: brief.tone, targetCustomer: brief.targetCustomer,
      keywords: brief.keywords, audience: "b2c",
    };
    const pieces = await Promise.all(plan.slots.map(async (slot): Promise<ContentPiece> => {
      const r = await generateContent({ channel: slot.platform, product, extra: brief.strategies?.[slot.platform] ?? null });
      return {
        platform: slot.platform,
        body: r.body,
        subject: r.subject,
        rationale: `Maintains a consistent ${slot.platform} presence for ${brief.productName}.`,
        imageQuery: brief.niche || brief.offering || brief.productName,
      };
    }));
    return {
      theme: brief.niche || brief.productName,
      summary: `Organic ${brief.tone || "on-brand"} content across ${brief.platforms.join(", ")}.`,
      pieces,
    };
  }
}
