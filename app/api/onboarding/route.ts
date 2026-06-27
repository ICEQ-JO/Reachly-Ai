import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await request.json();

  const [product] = await db.insert(products).values({
    ownerId:        session.user.id,
    name:           state.name,
    description:    state.description ?? null,
    type:           state.type ?? null,
    audience:       state.audience ?? null,
    scope:          state.scope ?? [],
    budgetMin:      state.budgetMin ?? 0,
    budgetMax:      state.budgetMax ?? 2000,
    channels:       state.channels ?? [],
    companyStage:   state.companyStage ?? null,
    targetTitles:   state.targetTitles ?? [],
    targetIndustry: state.targetIndustry ?? null,
    targetSizes:    state.targetSizes ?? [],
    keywords:       state.keywords ?? [],
    painPoint:      state.painPoint ?? null,
    differentiator: state.differentiator ?? null,
    targetCustomer: state.targetCustomer ?? null,
    niche:          state.niche ?? null,
    offering:       state.offering ?? null,
    tone:           state.tone ?? null,
    appType:        state.appType ?? null,
    goals:          state.goals ?? [],
    intensity:      state.intensity ?? null,
    onboardingDone: true,
  }).returning();

  // Fire classify in background (non-blocking)
  const base = new URL(request.url).origin;
  fetch(`${base}/api/classify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: product.id, ...state }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, productId: product.id });
}
