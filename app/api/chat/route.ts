import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, drafts, leads, chatMessages } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});
const model = openrouter("openai/gpt-4o-mini");

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const { message } = await request.json() as { message: string };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  // Gather rich context in parallel
  const [allCampaigns, recentDrafts, leadStats] = await Promise.all([
    db.select({ id: campaigns.id, name: campaigns.name, platforms: campaigns.platforms, type: campaigns.type, status: campaigns.status, createdAt: campaigns.createdAt })
      .from(campaigns).where(eq(campaigns.productId, product.id)).orderBy(desc(campaigns.createdAt)).limit(10),
    db.select({ id: drafts.id, platform: drafts.platform, channel: drafts.channel, body: drafts.body, status: drafts.status, scheduledDay: drafts.scheduledDay, scheduledTime: drafts.scheduledTime, engagements: drafts.engagements, postedAt: drafts.postedAt })
      .from(drafts).where(eq(drafts.productId, product.id)).orderBy(desc(drafts.createdAt)).limit(20),
    product.audience === "b2b"
      ? db.select({ total: count(), replied: sql<number>`count(*) filter (where ${leads.status} = 'replied')` }).from(leads).where(eq(leads.productId, product.id))
      : Promise.resolve([{ total: 0, replied: 0 }]),
  ]);

  // Build context JSON for the AI
  const context = {
    product: {
      name: product.name, description: product.description, type: product.type, audience: product.audience,
      niche: product.niche, tone: product.tone, painPoint: product.painPoint, differentiator: product.differentiator,
      targetTitles: product.targetTitles, targetIndustry: product.targetIndustry,
    },
    campaigns: allCampaigns.map(c => ({
      name: c.name, platforms: c.platforms, type: c.type, status: c.status,
      created: c.createdAt,
    })),
    recentContent: recentDrafts.map(d => ({
      platform: d.platform ?? d.channel,
      preview: d.body.slice(0, 120),
      status: d.status,
      scheduledFor: d.scheduledDay ? `${d.scheduledDay} ${d.scheduledTime}` : null,
      posted: !!d.postedAt,
      engagements: d.engagements,
    })),
    leads: leadStats[0],
  };

  // Save user message
  await db.insert(chatMessages).values({
    productId: product.id,
    role: "user",
    content: message,
    metadata: { type: "text" },
  });

  const systemPrompt = `You are an AI growth marketing strategist for a ${product.audience?.toUpperCase()} ${product.type ?? "SaaS"} product called "${product.name}".
You have full context about the user's product, campaigns, content, and analytics.
Respond helpfully, concisely, and with actionable insights. 
When relevant, structure your response as JSON cards using this format:

For analytics/stats: { "type": "analytics", "title": "...", "metrics": [{ "label": "...", "value": "...", "trend": "up|down|neutral" }] }
For campaign summaries: { "type": "campaign_summary", "name": "...", "platforms": [], "stats": { "posts": 0, "approved": 0 } }
For post previews: { "type": "post_preview", "platform": "...", "content": "..." }
For plain text: { "type": "text", "content": "..." }

Always respond with a JSON array of one or more cards: [{ "type": "...", ... }]

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}`;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: message,
  });

  // Parse card response
  let cards: Array<Record<string, unknown>>;
  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    cards = Array.isArray(parsed) ? parsed : [{ type: "text", content: text }];
  } catch {
    cards = [{ type: "text", content: text }];
  }

  // Save assistant message
  await db.insert(chatMessages).values({
    productId: product.id,
    role: "assistant",
    content: text,
    metadata: { type: "cards", cards },
  });

  return NextResponse.json({ ok: true, cards });
}
