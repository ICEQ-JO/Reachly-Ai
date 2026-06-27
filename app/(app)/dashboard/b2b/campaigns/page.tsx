import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, leads, drafts } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, Briefcase, Plus, Megaphone, Target, ChevronRight } from "lucide-react";

export default async function B2bCampaignsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true, name: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  // Fetch campaigns of type 'b2b-leads' or 'b2b-linkedin'
  const allCampaigns = await db.select({
    id: campaigns.id,
    name: campaigns.name,
    platforms: campaigns.platforms,
    type: campaigns.type,
    status: campaigns.status,
    createdAt: campaigns.createdAt,
    leadsCount: sql<number>`(select count(*) from leads where leads.campaign_id = ${campaigns.id})`,
    draftCount: sql<number>`(select count(*) from drafts where drafts.campaign_id = ${campaigns.id})`,
  }).from(campaigns)
    .where(and(
      eq(campaigns.productId, product.id),
      sql`${campaigns.type} in ('b2b-leads', 'b2b-linkedin')`
    ))
    .orderBy(desc(campaigns.createdAt));

  return (
    <div style={{ padding: "28px 32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>B2B Campaigns</h1>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Run prospecting scrapers and coordinate LinkedIn posting campaigns.</p>
        </div>
        <Link href="/dashboard/b2b/campaigns/new" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}>
          <Plus size={15} /> Start B2B Campaign
        </Link>
      </div>

      {allCampaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Megaphone size={28} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--fg)", marginBottom: "8px" }}>No campaigns yet</h2>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginBottom: "24px", maxWidth: "380px", margin: "0 auto 24px" }}>
            Launch a new B2B Lead Gen campaign to find contact details or a LinkedIn campaign to build organic social presence.
          </p>
          <Link href="/dashboard/b2b/campaigns/new" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "7px" }}>
            <Plus size={15} /> Create First Campaign
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {allCampaigns.map((c) => {
            const isLeads = c.type === "b2b-leads";
            const targetUrl = isLeads
              ? `/dashboard/b2b/vault?tab=leads&campaign=${c.id}`
              : `/dashboard/b2b/linkedin?campaign=${c.id}`;

            return (
              <Link key={c.id} href={targetUrl} className="campaign-card-link">
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isLeads ? <Users size={20} color="var(--accent)" /> : <Briefcase size={20} color="var(--accent)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>{c.name}</span>
                    <span className={`badge badge-${c.status === "active" ? "green" : "gray"}`}>{c.status}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", fontSize: "10px", color: "var(--fg-muted)", fontWeight: "600" }}>
                      {isLeads ? "Lead Gen / Scrape" : "LinkedIn Content"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--fg-faint)" }}>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {isLeads ? (
                    <>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{Number(c.leadsCount)}</div>
                      <div style={{ fontSize: "10px", color: "var(--fg-muted)" }}>leads found</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{Number(c.draftCount)}</div>
                      <div style={{ fontSize: "10px", color: "var(--fg-muted)" }}>linkedin posts</div>
                    </>
                  )}
                </div>
                <ChevronRight size={16} color="var(--fg-faint)" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
