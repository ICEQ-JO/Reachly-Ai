import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateB2cContentPlan } from "@/lib/ai";
import { searchPexelsImages } from "@/lib/pexels";
import { planDistribution } from "@/lib/b2c/planner";
import type { CampaignBrief, B2cPlatform } from "@/lib/b2c/types";

const PHOTO_POOL = [
  {
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    tags: ["tech", "developer", "software", "code", "programming", "computer", "saas", "paas", "website", "app"]
  },
  {
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    tags: ["growth", "marketing", "analytics", "seo", "sales", "finance", "data", "chart", "metrics", "strategy"]
  },
  {
    url: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80",
    tags: ["design", "creative", "ui", "ux", "art", "branding", "logo", "workshop", "meeting", "brainstorming"]
  },
  {
    url: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
    tags: ["workspace", "coffee", "laptop", "productivity", "office", "minimal", "desk", "writing", "blogging"]
  },
  {
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    tags: ["team", "collaboration", "startup", "people", "friends", "meeting", "business", "coworking"]
  },
  {
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
    tags: ["success", "achievement", "victory", "celebration", "finance", "investment", "growth", "business"]
  },
  {
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
    tags: ["fun", "vibrant", "games", "party", "social", "community", "event", "gathering", "entertainment"]
  },
  {
    url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
    tags: ["gaming", "esports", "vr", "console", "game", "controller", "fun", "play", "hobby"]
  },
  {
    url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=600&q=80",
    tags: ["target", "bullseye", "goal", "focus", "planning", "strategy", "aim", "marketing"]
  },
  {
    url: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=600&q=80",
    tags: ["mobile", "phone", "app", "ios", "android", "device", "ux", "screen", "wireframe"]
  },
  {
    url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80",
    tags: ["smartphone", "device", "social", "networking", "instagram", "facebook", "app", "mobile"]
  },
  {
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    tags: ["consulting", "executive", "professional", "meeting", "agreement", "corporate", "lawyer"]
  },
  {
    url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80",
    tags: ["customer", "service", "support", "helpdesk", "shopping", "ecommerce", "retail", "store"]
  },
  {
    url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80",
    tags: ["finance", "money", "saving", "crypto", "banking", "currency", "rich", "wealth"]
  },
  {
    url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=600&q=80",
    tags: ["tech", "development", "it", "hardware", "engineering", "network", "cybersecurity"]
  }
];

function getMockImageForProduct(product: any, index: number): string {
  const textToMatch = `${product.name} ${product.description || ""} ${product.niche || ""} ${product.offering || ""} ${(product.keywords || []).join(" ")}`.toLowerCase();
  
  const scored = PHOTO_POOL.map(img => {
    let score = 0;
    img.tags.forEach(tag => {
      if (textToMatch.includes(tag)) {
        score += 1;
      }
    });
    return { url: img.url, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const topImages = scored.slice(0, 5).map(x => x.url);
  return topImages[index % topImages.length];
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const body = await request.json();
  const { name, platforms, strategies, postCount, mediaType } = body as {
    name: string;
    platforms: string[];
    strategies: Record<string, Record<string, string>>;
    postCount?: number;
    mediaType?: string;
  };

  if (!name || !platforms || platforms.length === 0) {
    return NextResponse.json({ error: "name and platforms are required" }, { status: 400 });
  }

  // Create campaign record
  const [campaign] = await db.insert(campaigns).values({
    productId: product.id,
    name,
    platforms,
    type: "b2c-content",
    status: "active",
    settings: { ...strategies, postCount, mediaType },
  }).returning();

  const [run] = await db.insert(agentRuns).values({
    productId: product.id,
    campaignId: campaign.id,
    channel: "b2c-multi",
    type: "generate",
    status: "running",
  }).returning();

  try {
    // 1. CampaignBrief from the product + request.
    const brief: CampaignBrief = {
      productName: product.name,
      description: product.description ?? "",
      niche: product.niche ?? "",
      offering: product.offering ?? "",
      tone: product.tone ?? "",
      targetCustomer: product.targetCustomer ?? "",
      keywords: product.keywords ?? [],
      platforms: platforms.filter((p): p is B2cPlatform => ["instagram", "facebook", "reddit"].includes(p)),
      postCount: postCount && postCount > 0 ? postCount : 3,
      intensity: product.intensity ?? "steady",
      mediaType: mediaType || "mixed",
      strategies: strategies ?? {},
    };

    // 2. Deterministic distribution plan (where & when).
    const plan = planDistribution(brief);

    // 3. ONE LLM call → ContentPlan + ContentPiece[] (what & why).
    const contentPlan = await generateB2cContentPlan(brief, plan);

    // 4. Relevant imagery: Pexels pool → Unsplash placeholder fallback.
    const queryBase = [product.niche, product.offering, product.name].filter(Boolean).join(" ").trim();
    const pexelsPool = await searchPexelsImages(
      queryBase || contentPlan.pieces[0]?.imageQuery || "lifestyle brand",
      plan.slots.length + 4,
    );

    // 5. One draft per slot — status "draft", with proposed schedule + rationale (in imagePrompt).
    const toInsert: typeof drafts.$inferInsert[] = plan.slots.map((slot, idx) => {
      const piece = contentPlan.pieces[idx];
      const mediaUrl = pexelsPool.length > 0 ? pexelsPool[idx % pexelsPool.length] : getMockImageForProduct(product, idx);
      const body = piece.hashtags ? `${piece.body}\n\n${piece.hashtags}` : piece.body;
      return {
        productId: product.id,
        campaignId: campaign.id,
        channel: slot.platform,
        platform: slot.platform,
        body,
        subject: piece.subject ?? null,
        status: "draft",
        scheduledAt: slot.scheduledAt,
        scheduledDay: slot.scheduledDay,
        scheduledTime: slot.scheduledTime,
        imagePrompt: piece.rationale, // reuse imagePrompt to store the "why"
        mediaUrl,
        engagements: { likes: 0, comments: 0, shares: 0, reach: 0 },
      };
    });

    if (toInsert.length > 0) await db.insert(drafts).values(toInsert);

    // 6. Persist the content plan on the campaign (jsonb settings, no schema change).
    await db.update(campaigns).set({
      settings: {
        ...strategies, postCount: brief.postCount, mediaType: brief.mediaType,
        contentPlan: { theme: contentPlan.theme, summary: contentPlan.summary, cadence: plan.cadence },
      },
    }).where(eq(campaigns.id, campaign.id));

    await db.update(agentRuns).set({
      status: "succeeded",
      output: { draftsGenerated: toInsert.length, platforms, theme: contentPlan.theme },
    }).where(eq(agentRuns.id, run.id));

    return NextResponse.json({ ok: true, campaignId: campaign.id, draftsGenerated: toInsert.length, theme: contentPlan.theme });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } })
      .where(eq(agentRuns.id, run.id));
    console.error("[b2c/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
