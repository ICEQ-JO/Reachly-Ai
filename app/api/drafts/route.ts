import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drafts, products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: eq(products.ownerId, session.user.id),
  });
  if (!product) return NextResponse.json({ error: "No product" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  const conditions = [eq(drafts.productId, product.id)];
  if (channel) {
    conditions.push(eq(drafts.channel, channel));
  }

  const allDrafts = await db.query.drafts.findMany({
    where: and(...conditions),
    orderBy: [desc(drafts.createdAt)],
  });

  return NextResponse.json({ ok: true, drafts: allDrafts });
}
