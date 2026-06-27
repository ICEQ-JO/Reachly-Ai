import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts, campaigns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import B2bLinkedinClient from "./B2bLinkedinClient";

export default async function B2bLinkedinPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });
  if (!product) redirect("/onboarding");

  // Fetch B2B LinkedIn campaigns
  const b2bCampaigns = await db.query.campaigns.findMany({
    where: and(eq(campaigns.productId, product.id), eq(campaigns.type, "b2b-linkedin")),
    orderBy: [desc(campaigns.createdAt)],
  });

  // Fetch LinkedIn drafts
  const linkedinDrafts = await db.query.drafts.findMany({
    where: and(eq(drafts.productId, product.id), eq(drafts.channel, "linkedin")),
    orderBy: [desc(drafts.createdAt)],
  });

  return (
    <B2bLinkedinClient
      initialDrafts={linkedinDrafts}
      campaigns={b2bCampaigns}
    />
  );
}
