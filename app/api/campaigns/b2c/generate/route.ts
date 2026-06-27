import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const count = postCount && postCount > 0 ? postCount : 3;
    const tasks: { platform: string; index: number }[] = [];
    for (const platform of platforms) {
      for (let i = 0; i < count; i++) {
        tasks.push({ platform, index: i });
      }
    }

    // Generate content in parallel for all platform posts
    const results = await Promise.allSettled(
      tasks.map(({ platform, index }) =>
        generateContent({
          channel: platform as "instagram" | "facebook" | "reddit",
          product,
          extra: {
            ...strategies[platform],
            postIndex: `${index + 1} of ${count}`,
            mediaType: mediaType || "mixed",
          },
        })
      )
    );

    const toInsert: typeof drafts.$inferInsert[] = [];

    results.forEach((result, idx) => {
      const task = tasks[idx];
      const platform = task.platform;
      if (result.status === "fulfilled") {
        toInsert.push({
          productId: product.id,
          campaignId: campaign.id,
          channel: platform,
          platform,
          body: result.value.body,
          subject: result.value.subject ?? null,
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
      output: { draftsGenerated: toInsert.length, platforms },
    }).where(eq(agentRuns.id, run.id));

    return NextResponse.json({ ok: true, campaignId: campaign.id, draftsGenerated: toInsert.length });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } })
      .where(eq(agentRuns.id, run.id));
    console.error("[b2c/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
