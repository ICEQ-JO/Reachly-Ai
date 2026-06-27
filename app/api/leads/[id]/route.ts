import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const product = await db.query.products.findFirst({
    where: eq(products.ownerId, session.user.id),
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const allowedFields = ["status", "notes", "lastContactedAt", "kpiData"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db.update(leads)
    .set(updates)
    .where(and(eq(leads.id, id), eq(leads.productId, product.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json({ ok: true, lead: updated });
}
