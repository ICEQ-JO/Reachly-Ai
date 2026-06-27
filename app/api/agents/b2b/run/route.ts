import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { runLeadSearch } from "@/lib/apify";
import { generateContent } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const channel: string = body.channel ?? "all";

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });

  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const [run] = await db.insert(agentRuns).values({
    productId: product.id,
    channel,
    type: "generate",
    status: "running",
  }).returning();

  const result: Record<string, unknown> = {};

  try {
    // LinkedIn post
    if (channel === "all" || channel === "linkedin") {
      const content = await generateContent({ channel: "linkedin", product });
      await db.insert(drafts).values({
        productId: product.id,
        channel: "linkedin",
        body: content.body,
        status: "draft",
      });
      result.linkedinDraft = true;
    }

    await db.update(agentRuns).set({ status: "succeeded", output: result }).where(eq(agentRuns.id, run.id));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
    console.error("[b2b/run]", err);
    return NextResponse.json({ error: "B2B pipeline failed" }, { status: 500 });
  }
}
