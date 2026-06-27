import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { productId, ...fields } = body;

  const allowed: (keyof typeof products.$inferInsert)[] = [
    "name", "description", "painPoint", "differentiator", "targetCustomer", "niche", "offering",
  ];

  const update: Partial<typeof products.$inferInsert> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  await db.update(products)
    .set(update)
    .where(and(eq(products.id, productId), eq(products.ownerId, session.user.id)));

  return NextResponse.json({ ok: true });
}
