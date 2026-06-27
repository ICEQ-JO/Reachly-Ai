import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });
  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const { items } = await request.json() as {
    items: { leadId: string; subject: string; body: string }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  try {
    const toInsert = items.map(item => ({
      productId: product.id,
      leadId: item.leadId,
      channel: "cold-email",
      platform: "email",
      subject: item.subject,
      body: item.body,
      status: "draft" as const,
    }));

    await db.insert(drafts).values(toInsert);

    return NextResponse.json({ ok: true, count: toInsert.length });
  } catch (err) {
    console.error("[save-batch]", err);
    return NextResponse.json({ error: "Batch save failed" }, { status: 500 });
  }
}
