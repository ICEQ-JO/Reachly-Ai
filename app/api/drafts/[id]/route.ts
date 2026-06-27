import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drafts, products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Verify ownership
  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const allowedFields = ["body", "subject", "status", "scheduledDay", "scheduledTime", "scheduledAt", "postedAt", "engagements", "imagePrompt"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db.update(drafts)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(drafts.id, id), eq(drafts.productId, product.id)))
    .returning({ id: drafts.id, status: drafts.status });

  if (!updated) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  return NextResponse.json({ ok: true, draft: updated });
}
