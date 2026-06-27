import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads, campaigns, drafts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import LeadsVaultClient from "./LeadsVaultClient";

export default async function B2bVaultPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
  });
  if (!product) redirect("/onboarding");

  // Fetch campaigns for dropdown
  const allCampaigns = await db.query.campaigns.findMany({
    where: eq(campaigns.productId, product.id),
    orderBy: [desc(campaigns.createdAt)],
  });

  // Fetch all leads
  const allLeads = await db.query.leads.findMany({
    where: eq(leads.productId, product.id),
    orderBy: [desc(leads.createdAt)],
  });

  // Fetch draft cold emails
  const draftEmails = await db.query.drafts.findMany({
    where: and(eq(drafts.productId, product.id), eq(drafts.channel, "cold-email")),
    orderBy: [desc(drafts.createdAt)],
  });

  return (
    <LeadsVaultClient
      initialLeads={allLeads}
      campaigns={allCampaigns}
      initialDrafts={draftEmails}
    />
  );
}
