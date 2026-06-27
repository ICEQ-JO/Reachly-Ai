import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drafts, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true },
  });

  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const update: Partial<typeof drafts.$inferInsert> = {};
  if (typeof body.status === "string") update.status = body.status;
  if (typeof body.body   === "string") update.body   = body.body;
  if (body.scheduledAt) update.scheduledAt = new Date(body.scheduledAt);

  await db.update(drafts).set(update).where(and(eq(drafts.id, id), eq(drafts.productId, product.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true },
  });

  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  await db.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.productId, product.id)));

  return NextResponse.json({ ok: true });
}
