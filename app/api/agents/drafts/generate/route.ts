import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateContent } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });

  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const [run] = await db.insert(agentRuns).values({
    productId: product.id,
    channel: "cold-email",
    type: "generate",
    status: "running",
  }).returning();

  try {
    const newLeads = await db.select().from(leads)
      .where(and(eq(leads.productId, product.id), eq(leads.status, "new")))
      .limit(10);

    const generated: { leadId: string; subject?: string; body: string }[] = [];

    for (const lead of newLeads) {
      const content = await generateContent({ channel: "cold-email", product, lead });
      generated.push({ leadId: lead.id, ...content });
    }

    if (generated.length > 0) {
      await db.insert(drafts).values(
        generated.map(({ leadId, subject, body }) => ({
          productId: product.id,
          leadId,
          channel: "cold-email",
          subject: subject ?? null,
          body,
          status: "draft",
        }))
      );
    }

    await db.update(agentRuns).set({
      status: "succeeded",
      output: { draftsGenerated: generated.length },
    }).where(eq(agentRuns.id, run.id));

    return NextResponse.json({ ok: true, draftsGenerated: generated.length });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
    console.error("[drafts/generate]", err);
    return NextResponse.json({ error: "Draft generation failed" }, { status: 500 });
  }
}
