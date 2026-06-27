import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, leads, drafts, campaigns, agentRuns } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, Mail, Briefcase, TrendingUp, CheckCircle2, Zap, ArrowRight, Activity, Megaphone, Target, Archive } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";

// Bucket a set of dated items into the last `n` weekly buckets (oldest → newest).
function weeklyBuckets(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, idx) => {
    const i = n - 1 - idx; // weeks ago
    const end = new Date(now); end.setDate(now.getDate() - i * 7);
    return { weeksAgo: i, label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });
}
function bucketIndex(date: Date, n: number) {
  const days = (Date.now() - new Date(date).getTime()) / 86400000;
  const weeksAgo = Math.floor(days / 7);
  return weeksAgo < n ? n - 1 - weeksAgo : -1;
}

export default async function B2bDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  const [[leadStats], [draftStats], recentCampaigns, recentRuns, leadsList] = await Promise.all([
    db.select({
      total:     count(),
      replied:   sql<number>`count(*) filter (where ${leads.status} = 'replied')`,
      newLeads:  sql<number>`count(*) filter (where ${leads.status} = 'new')`,
    }).from(leads).where(eq(leads.productId, product.id)),
    db.select({
      emails:   sql<number>`count(*) filter (where ${drafts.channel} = 'cold-email')`,
      approved: sql<number>`count(*) filter (where ${drafts.status} = 'approved')`,
      linkedin: sql<number>`count(*) filter (where ${drafts.channel} = 'linkedin')`,
    }).from(drafts).where(eq(drafts.productId, product.id)),
    db.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status, createdAt: campaigns.createdAt })
      .from(campaigns).where(and(eq(campaigns.productId, product.id), sql`${campaigns.type} in ('b2b-leads', 'b2b-linkedin')`))
      .orderBy(desc(campaigns.createdAt)).limit(3),
    db.select({ id: agentRuns.id, channel: agentRuns.channel, status: agentRuns.status, createdAt: agentRuns.createdAt })
      .from(agentRuns).where(eq(agentRuns.productId, product.id))
      .orderBy(desc(agentRuns.createdAt)).limit(5),
    db.select({ createdAt: leads.createdAt, status: leads.status })
      .from(leads).where(eq(leads.productId, product.id)),
  ]);

  // Weekly lead-flow chart (new leads + replies over the last 6 weeks)
  const WEEKS = 6;
  const buckets = weeklyBuckets(WEEKS);
  const leadVals = new Array(WEEKS).fill(0);
  const replyVals = new Array(WEEKS).fill(0);
  for (const l of leadsList) {
    const bi = bucketIndex(l.createdAt as Date, WEEKS);
    if (bi >= 0) { leadVals[bi] += 1; if (l.status === "replied") replyVals[bi] += 1; }
  }
  const recentLeads = leadVals.slice(-3).reduce((a, b) => a + b, 0);
  const prevLeads = leadVals.slice(0, 3).reduce((a, b) => a + b, 0);
  const leadTrend = prevLeads > 0 ? Math.round(((recentLeads - prevLeads) / prevLeads) * 100) : 0;

  const replyRate = Number(leadStats.total) > 0
    ? Math.round((Number(leadStats.replied) / Number(leadStats.total)) * 100)
    : 0;

  const kpis = [
    { label: "Total Leads", value: Number(leadStats.total), icon: <Users size={18} />, color: "#2563eb", href: "/dashboard/b2b/vault", delta: `${Number(leadStats.newLeads)} new` },
    { label: "Emails Drafted", value: Number(draftStats.emails), icon: <Mail size={18} />, color: "#d97706", href: "/dashboard/b2b/vault", delta: `${Number(draftStats.approved)} approved` },
    { label: "Reply Rate", value: `${replyRate}%`, icon: <CheckCircle2 size={18} />, color: "#16a34a", href: "/dashboard/b2b/vault", delta: `${Number(leadStats.replied)} replied` },
    { label: "LinkedIn Posts", value: Number(draftStats.linkedin), icon: <Briefcase size={18} />, color: "#7c3aed", href: "/dashboard/b2b/linkedin", delta: "content pieces" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1040px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ width: "32px", height: "32px", background: "var(--accent-bg)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{product.name}</h1>
          <span className="badge badge-blue">B2B</span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginLeft: "42px" }}>
          {product.type?.toUpperCase() ?? "SaaS"} · {product.scope?.join(", ") ?? "Global"} · {product.targetIndustry ?? "All industries"}
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

      {/* Lead-flow trend chart */}
      <div style={{ marginBottom: "20px" }}>
        <TrendChart
          title="Lead Flow — last 6 weeks"
          xLabels={buckets.map((b) => b.label)}
          series={[
            { label: "New leads", color: "#2563eb", values: leadVals, area: true },
            { label: "Replies", color: "#16a34a", values: replyVals },
          ]}
          total={String(Number(leadStats.total))}
          totalLabel="total leads"
          trend={leadTrend}
        />
      </div>

      {/* 2-col: ICP + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Target Profile</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {[
              { l: "Titles", v: product.targetTitles?.slice(0, 2).join(", ") || "—" },
              { l: "Industry", v: product.targetIndustry || "—" },
              { l: "Sizes", v: product.targetSizes?.join(", ") || "—" },
              { l: "Budget", v: `$${product.budgetMin}–$${product.budgetMax}/mo` },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "var(--fg-faint)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</span>
                <span style={{ fontSize: "12px", color: "var(--fg)", fontWeight: "500", maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
              </div>
            ))}
          </div>
          {product.painPoint && (
            <div style={{ marginTop: "12px", padding: "10px", background: "var(--accent-bg)", borderRadius: "7px", border: "1px solid var(--accent-border)" }}>
              <div style={{ fontSize: "10px", color: "var(--accent)", fontWeight: "700", marginBottom: "3px" }}>PAIN POINT</div>
              <div style={{ fontSize: "12px", color: "var(--fg)", lineHeight: "1.5" }}>{product.painPoint}</div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { href: "/dashboard/b2b/campaigns", icon: <Megaphone size={13} />, label: "New Lead Campaign" },
              { href: "/dashboard/b2b/vault",     icon: <Archive size={13} />,   label: "View Lead Vault" },
              { href: "/dashboard/b2b/linkedin",  icon: <Briefcase size={13} />, label: "Generate LinkedIn Post" },
              { href: "/dashboard/b2b/chat",      icon: <Activity size={13} />,  label: "Ask AI Strategist" },
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

      {/* Recent campaigns + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {recentCampaigns.length > 0 && (
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Campaigns</h3>
              <Link href="/dashboard/b2b/campaigns" style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {recentCampaigns.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "7px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Target size={12} color="var(--accent)" />
                    <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--fg)" }}>{c.name}</span>
                  </div>
                  <span className={`badge badge-${c.status === "active" ? "green" : "gray"}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {recentRuns.length > 0 && (
          <div className="card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Activity Log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {recentRuns.map((run) => (
                <div key={run.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-subtle)", borderRadius: "7px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: run.status === "succeeded" ? "var(--green)" : run.status === "failed" ? "var(--red)" : "var(--accent)" }} />
                    <span style={{ fontSize: "12px", color: "var(--fg)" }}>{run.channel}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--fg-faint)" }}>{new Date(run.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
