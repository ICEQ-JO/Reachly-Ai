import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const model = openrouter("openai/gpt-4o-mini");

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });
  if (!product) return NextResponse.json({ error: "No product found" }, { status: 404 });

  const { leadIds, instruction } = await request.json() as { leadIds: string[]; instruction: string };
  if (!leadIds || leadIds.length === 0 || !instruction) {
    return NextResponse.json({ error: "leadIds and instruction are required" }, { status: 400 });
  }

  // Fetch the selected leads
  const selectedLeads = await db.select().from(leads).where(inArray(leads.id, leadIds));

  try {
    const promises = selectedLeads.map(async (lead) => {
      const prompt = `Write a personalized cold email for:
Lead Name: ${lead.name ?? "Decision Maker"}
Lead Title: ${lead.title ?? "their role"}
Lead Company: ${lead.company ?? "their company"}
Product Name: ${product.name}
Product Description: ${product.description ?? ""}

User instruction/guideline: "${instruction}"

Return JSON: { "subject": "compelling email subject line", "body": "email body with personalization, 3 short paragraphs, CTA at end" }`;

      const { text } = await generateText({
        model,
        system: "You are an expert cold outreach strategist. Respond with valid JSON only.",
        prompt,
      });

      try {
        const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(clean);
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadCompany: lead.company,
          subject: parsed.subject,
          body: parsed.body,
        };
      } catch (err) {
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadCompany: lead.company,
          subject: `Introduction to ${product.name}`,
          body: text,
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const emails = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return NextResponse.json({ ok: true, emails });
  } catch (err) {
    console.error("[generate-custom]", err);
    return NextResponse.json({ error: "Custom generation failed" }, { status: 500 });
  }
}
