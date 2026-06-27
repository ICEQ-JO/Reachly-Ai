import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts, agentRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateContent } from "@/lib/ai";

const B2C_CHANNELS = ["instagram", "reddit", "facebook"] as const;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const channels: string[] = body.channels ?? [...B2C_CHANNELS];

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });

  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const [run] = await db.insert(agentRuns).values({
    productId: product.id,
    channel: channels.join(","),
    type: "generate",
    status: "running",
  }).returning();

  try {
    const generated: { channel: string; subject?: string; body: string }[] = [];

    for (const ch of channels) {
      const content = await generateContent({ channel: ch, product });
      generated.push({ channel: ch, ...content });
    }

    if (generated.length > 0) {
      await db.insert(drafts).values(
        generated.map(({ channel, subject, body }) => ({
          productId: product.id,
          channel,
          subject: subject ?? null,
          body,
          status: "draft",
        }))
      );
    }

    await db.update(agentRuns).set({
      status: "succeeded",
      output: { draftsGenerated: generated.length, channels },
    }).where(eq(agentRuns.id, run.id));

    return NextResponse.json({ ok: true, draftsGenerated: generated.length });
  } catch (err) {
    await db.update(agentRuns).set({ status: "failed", output: { error: String(err) } }).where(eq(agentRuns.id, run.id));
    console.error("[b2c/run]", err);
    return NextResponse.json({ error: "B2C content generation failed" }, { status: 500 });
  }
}
