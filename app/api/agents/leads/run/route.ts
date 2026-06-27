import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads, agentRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { runLeadSearch } from "@/lib/apify";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });

  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const [run] = await db.insert(agentRuns).values({
    productId: product.id,
    channel: "lead-gen",
    type: "generate",
    status: "running",
  }).returning();

  let body: { settings?: { titles?: string[]; industry?: string; sizes?: string[]; keywords?: string[]; limit?: number } } = {};
  try { body = await request.json(); } catch { /* no body */ }
  const overrides = body.settings ?? {};

  try {
    const scraped = await runLeadSearch({
      titles:       overrides.titles       ?? product.targetTitles ?? [],
      industry:     overrides.industry     ?? product.targetIndustry,
      companySizes: overrides.sizes        ?? product.targetSizes,
      keywords:     overrides.keywords     ?? product.keywords,
      limit:        overrides.limit        ?? 25,
    });

    if (scraped.length > 0) {
      await db.insert(leads).values(
        scraped.map((l) => ({
          productId:   product.id,
          name:        l.name,
          title:       l.title,
          company:     l.company,
          email:       l.email,
          linkedinUrl: l.linkedinUrl,
          source:      "apollo",
          raw:         l.raw,
        }))
      );
    }

    await db.update(agentRuns).set({
      status: "succeeded",
      output: { leadsFound: scraped.length },
    }).where(eq(agentRuns.id, run.id));

    return NextResponse.json({ ok: true, leadsFound: scraped.length });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
    console.error("[leads/run]", err);
    return NextResponse.json({ error: "Lead gen failed", detail: String(err) }, { status: 500 });
  }
}
