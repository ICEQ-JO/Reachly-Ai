import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts, campaigns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { PostVault } from "./PostVault";

export default async function B2cVaultPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { campaign: campaignParam } = await searchParams;

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  const [allDrafts, allCampaigns] = await Promise.all([
    db.select({
      id: drafts.id,
      channel: drafts.channel,
      platform: drafts.platform,
      body: drafts.body,
      subject: drafts.subject,
      status: drafts.status,
      campaignId: drafts.campaignId,
      engagements: drafts.engagements,
      scheduledDay: drafts.scheduledDay,
      scheduledTime: drafts.scheduledTime,
      createdAt: drafts.createdAt,
    }).from(drafts)
      .where(eq(drafts.productId, product.id))
      .orderBy(desc(drafts.createdAt)),

    db.select({ id: campaigns.id, name: campaigns.name })
      .from(campaigns)
      .where(and(eq(campaigns.productId, product.id), eq(campaigns.type, "b2c-content")))
      .orderBy(desc(campaigns.createdAt)),
  ]);

  return (
    <PostVault
      drafts={allDrafts as any}
      campaigns={allCampaigns}
      selectedCampaign={campaignParam}
    />
  );
}
