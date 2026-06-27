import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, campaigns, drafts } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { Globe, MessageCircle, Plus, Megaphone, TrendingUp, ChevronRight } from "lucide-react";
import { Instagram } from "@/components/icons/Instagram";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram size={12} color="#e1306c" />,
  facebook:  <Globe size={12} color="#1877f2" />,
  reddit:    <MessageCircle size={12} color="#ff4500" />,
};

export default async function B2cCampaignsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true, name: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  const allCampaigns = await db.select({
    id: campaigns.id,
    name: campaigns.name,
    platforms: campaigns.platforms,
    status: campaigns.status,
    createdAt: campaigns.createdAt,
    draftCount: sql<number>`(select count(*) from drafts where drafts.campaign_id = ${campaigns.id})`,
    approvedCount: sql<number>`(select count(*) from drafts where drafts.campaign_id = ${campaigns.id} and drafts.status = 'approved')`,
  }).from(campaigns)
    .where(and(eq(campaigns.productId, product.id), eq(campaigns.type, "b2c-content")))
    .orderBy(desc(campaigns.createdAt));

  return (
    <div style={{ padding: "28px 32px", maxWidth: "860px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "4px" }}>Campaigns</h1>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Create and manage your content campaigns across platforms.</p>
        </div>
        <Link href="/dashboard/b2c/campaigns/new" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}>
          <Plus size={15} /> New Campaign
        </Link>
      </div>

      {allCampaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Megaphone size={28} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--fg)", marginBottom: "8px" }}>No campaigns yet</h2>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginBottom: "24px", maxWidth: "340px", margin: "0 auto 24px" }}>
            Create your first campaign to start generating tailored content for Instagram, Facebook, and Reddit.
          </p>
          <Link href="/dashboard/b2c/campaigns/new" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "7px" }}>
            <Plus size={15} /> Create First Campaign
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {allCampaigns.map((c) => (
            <Link key={c.id} href={`/dashboard/b2c/vault?campaign=${c.id}`} className="campaign-card-link">
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Megaphone size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>{c.name}</span>
                  <span className={`badge badge-${c.status === "active" ? "green" : c.status === "completed" ? "blue" : "gray"}`}>{c.status}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {(c.platforms ?? []).map((p) => (
                      <span key={p} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", fontSize: "10px", color: "var(--fg-muted)", fontWeight: "600" }}>
                        {PLATFORM_ICONS[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--fg-faint)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{Number(c.draftCount)}</div>
                <div style={{ fontSize: "10px", color: "var(--fg-muted)" }}>posts · {Number(c.approvedCount)} approved</div>
              </div>
              <ChevronRight size={16} color="var(--fg-faint)" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
