import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts, campaigns, agentRuns } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { Globe, MessageCircle, TrendingUp, Zap, ArrowRight, Calendar, MessageSquare, Archive, Megaphone } from "lucide-react";
import { Instagram } from "@/components/icons/Instagram";
import { TrendChart } from "@/components/charts/TrendChart";
import { publishDueDrafts } from "@/lib/b2c/scheduler";

function weeklyBuckets(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, idx) => {
    const i = n - 1 - idx;
    const end = new Date(now); end.setDate(now.getDate() - i * 7);
    return { label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });
}
function bucketIndex(date: Date, n: number) {
  const weeksAgo = Math.floor((Date.now() - new Date(date).getTime()) / 86400000 / 7);
  return weeksAgo < n ? n - 1 - weeksAgo : -1;
}

export default async function B2cDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  // Auto-publish any scheduled posts whose time has arrived.
  await publishDueDrafts(product.id);

  const [[draftStats], recentCampaigns, recentRuns, postedDrafts] = await Promise.all([
    db.select({
      total:     count(),
      instagram: sql<number>`count(*) filter (where ${drafts.channel} = 'instagram')`,
      facebook:  sql<number>`count(*) filter (where ${drafts.channel} = 'facebook')`,
      reddit:    sql<number>`count(*) filter (where ${drafts.channel} = 'reddit')`,
      approved:  sql<number>`count(*) filter (where ${drafts.status} = 'approved')`,
      scheduled: sql<number>`count(*) filter (where ${drafts.status} = 'scheduled')`,
    }).from(drafts).where(eq(drafts.productId, product.id)),
    db.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status, platforms: campaigns.platforms, createdAt: campaigns.createdAt })
      .from(campaigns).where(and(eq(campaigns.productId, product.id), eq(campaigns.type, "b2c-content")))
      .orderBy(desc(campaigns.createdAt)).limit(3),
    db.select({ id: agentRuns.id, channel: agentRuns.channel, status: agentRuns.status, createdAt: agentRuns.createdAt })
      .from(agentRuns).where(eq(agentRuns.productId, product.id))
      .orderBy(desc(agentRuns.createdAt)).limit(5),
    db.select({ postedAt: drafts.postedAt, engagements: drafts.engagements })
      .from(drafts).where(and(eq(drafts.productId, product.id), sql`${drafts.postedAt} is not null`)),
  ]);

  // Weekly audience-reach chart from posted content
  const WEEKS = 6;
  const buckets = weeklyBuckets(WEEKS);
  const reachVals = new Array(WEEKS).fill(0);
  let totalReach = 0;
  for (const d of postedDrafts) {
    const reach = Number((d.engagements as { reach?: number } | null)?.reach ?? 0);
    totalReach += reach;
    const bi = d.postedAt ? bucketIndex(d.postedAt as Date, WEEKS) : -1;
    if (bi >= 0) reachVals[bi] += reach;
  }
  const recentReach = reachVals.slice(-3).reduce((a, b) => a + b, 0);
  const prevReach = reachVals.slice(0, 3).reduce((a, b) => a + b, 0);
  const reachTrend = prevReach > 0 ? Math.round(((recentReach - prevReach) / prevReach) * 100) : 0;
  const fmtReach = totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}K` : String(totalReach);

  const engagementRate = Number(draftStats.total) > 0
    ? Math.round((Number(draftStats.approved) / Number(draftStats.total)) * 100)
    : 0;

  const kpis = [
    { label: "Total Posts", value: Number(draftStats.total), icon: <Globe size={18} />, color: "#2563eb", href: "/dashboard/b2c/vault", delta: `${Number(draftStats.approved)} approved` },
    { label: "Instagram", value: Number(draftStats.instagram), icon: <Instagram size={18} />, color: "#e1306c", href: "/dashboard/b2c/vault", delta: "posts created" },
    { label: "Reddit", value: Number(draftStats.reddit), icon: <MessageCircle size={18} />, color: "#ff4500", href: "/dashboard/b2c/vault", delta: "posts created" },
    { label: "Scheduled", value: Number(draftStats.scheduled), icon: <Calendar size={18} />, color: "#16a34a", href: "/dashboard/b2c/schedule", delta: "queued to post" },
  ];

  const platformIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram size={12} color="#e1306c" />,
    facebook:  <Globe size={12} color="#1877f2" />,
    reddit:    <MessageCircle size={12} color="#ff4500" />,
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1040px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ width: "32px", height: "32px", background: "var(--accent-bg)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{product.name}</h1>
          <span className="badge badge-purple">B2C</span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginLeft: "42px" }}>
          {product.niche ?? "Content Marketing"} · {product.tone ?? "Professional"} · {product.intensity ?? "Steady"} intensity
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {kpis.map(({ label, value, icon, color, href, delta }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div className="stat-card-interactive">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
                <TrendingUp size={11} color="var(--fg-faint)" />
              </div>
              <div className="stat-value">{value}</div>
              <div className="stat-label" style={{ marginTop: "4px" }}>{label}</div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--accent)", fontWeight: "500" }}>{delta}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Audience-reach trend chart */}
      <div style={{ marginBottom: "20px" }}>
        <TrendChart
          title="Audience Reach — last 6 weeks"
          xLabels={buckets.map((b) => b.label)}
          series={[{ label: "Reach", color: "#e1306c", values: reachVals, area: true }]}
          total={fmtReach}
          totalLabel="total reach"
          trend={reachTrend}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Content Strategy */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Content Strategy</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {[
              { l: "Target", v: product.targetCustomer || "—" },
              { l: "Niche", v: product.niche || "—" },
              { l: "Tone", v: product.tone || "—" },
              { l: "Goals", v: product.goals?.slice(0, 2).join(", ") || "—" },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "var(--fg-faint)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</span>
                <span style={{ fontSize: "12px", color: "var(--fg)", fontWeight: "500", maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px", padding: "10px", background: "var(--accent-bg)", borderRadius: "7px", border: "1px solid var(--accent-border)" }}>
            <div style={{ fontSize: "10px", color: "var(--accent)", fontWeight: "700", marginBottom: "4px" }}>APPROVAL RATE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${engagementRate}%`, height: "100%", background: "var(--accent)", borderRadius: "3px" }} />
              </div>
              <span style={{ fontSize: "12px", color: "var(--fg)", fontWeight: "600" }}>{engagementRate}%</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { href: "/dashboard/b2c/campaigns", icon: <Megaphone size={13} />, label: "New Content Campaign" },
              { href: "/dashboard/b2c/vault",     icon: <Archive size={13} />,   label: "View Post Vault" },
              { href: "/dashboard/b2c/schedule",  icon: <Calendar size={13} />,  label: "Schedule Posts" },
              { href: "/dashboard/b2c/chat",      icon: <MessageSquare size={13} />, label: "Ask AI Strategist" },
            ].map(({ href, icon, label }) => (
              <Link key={href} href={href} className="quick-action-link">
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>{icon}</div>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: "500" }}>{label}</span>
                <ArrowRight size={12} color="var(--fg-faint)" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent campaigns */}
      {recentCampaigns.length > 0 && (
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent Campaigns</h3>
            <Link href="/dashboard/b2c/campaigns" style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recentCampaigns.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--fg)" }}>{c.name}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {(c.platforms ?? []).map((p) => (
                      <span key={p} style={{ display: "flex" }}>{platformIcons[p]}</span>
                    ))}
                  </div>
                </div>
                <span className={`badge badge-${c.status === "active" ? "green" : "gray"}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
