import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyProduct } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { productId, ...state } = await request.json();
    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

    const classification = await classifyProduct(state);

    await db.update(products)
      .set({ classification })
      .where(eq(products.id, productId));

    return NextResponse.json({ ok: true, classification });
  } catch (err) {
    console.error("[classify]", err);
    return NextResponse.json({ error: "Classify failed" }, { status: 500 });
  }
}
