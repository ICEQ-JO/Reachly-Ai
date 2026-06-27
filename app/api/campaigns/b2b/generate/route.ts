import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, leads, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { runLeadSearch } from "@/lib/apify";
import { generateContent } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const body = await request.json();
  const { name, type, settings } = body as {
    name: string;
    type: "b2b-leads" | "b2b-linkedin";
    settings: any;
  };

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  // Create campaign record
  const [campaign] = await db.insert(campaigns).values({
    productId: product.id,
    name,
    type,
    status: "active",
    settings,
  }).returning();

  if (type === "b2b-leads") {
    // Lead generation prospecting campaign
    const [run] = await db.insert(agentRuns).values({
      productId: product.id,
      campaignId: campaign.id,
      channel: "lead-gen",
      type: "generate",
      status: "running",
    }).returning();

    try {
      const scraped = await runLeadSearch({
        titles:       settings.titles       ?? product.targetTitles ?? [],
        industry:     settings.industry     ?? product.targetIndustry,
        companySizes: settings.sizes        ?? product.targetSizes,
        keywords:     settings.keywords     ?? product.keywords,
        limit:        settings.limit        ?? 20,
      });

      if (scraped.length > 0) {
        await db.insert(leads).values(
          scraped.map((l) => ({
            productId:   product.id,
            campaignId:  campaign.id,
            name:        l.name,
            title:       l.title,
            company:     l.company,
            email:       l.email,
            linkedinUrl: l.linkedinUrl,
            source:      "apollo",
            raw:         l.raw,
            status:      "new",
          }))
        );
      }

      await db.update(agentRuns).set({
        status: "succeeded",
        output: { leadsFound: scraped.length },
      }).where(eq(agentRuns.id, run.id));

      return NextResponse.json({ ok: true, campaignId: campaign.id, leadsFound: scraped.length });
    } catch (err) {
      await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
      console.error("[b2b/generate leads]", err);
      return NextResponse.json({ error: "Lead generation failed", detail: String(err) }, { status: 500 });
    }
  } else {
    // LinkedIn post generation campaign
    const [run] = await db.insert(agentRuns).values({
      productId: product.id,
      campaignId: campaign.id,
      channel: "linkedin",
      type: "generate",
      status: "running",
    }).returning();

    try {
      // Generate multiple LinkedIn posts in parallel (default 3 posts)
      const count = Number(settings.postCount || 3);
      const promises = Array.from({ length: count }).map(() =>
        generateContent({
          channel: "linkedin",
          product,
          extra: settings,
        })
      );

      const results = await Promise.allSettled(promises);
      const toInsert: typeof drafts.$inferInsert[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          toInsert.push({
            productId: product.id,
            campaignId: campaign.id,
            channel: "linkedin",
            platform: "linkedin",
            body: result.value.body,
            status: "draft",
            engagements: { likes: 0, comments: 0, shares: 0, reach: 0 },
          });
        }
      });

      if (toInsert.length > 0) {
        await db.insert(drafts).values(toInsert);
      }

      await db.update(agentRuns).set({
        status: "succeeded",
        output: { draftsGenerated: toInsert.length },
      }).where(eq(agentRuns.id, run.id));

      return NextResponse.json({ ok: true, campaignId: campaign.id, draftsGenerated: toInsert.length });
    } catch (err) {
      await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
      console.error("[b2b/generate linkedin]", err);
      return NextResponse.json({ error: "LinkedIn generation failed", detail: String(err) }, { status: 500 });
    }
  }
}
