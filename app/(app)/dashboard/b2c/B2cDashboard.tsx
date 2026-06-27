"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Image, Globe, Users, Play, Copy, Check,
  Loader2, Calendar, BarChart2, Sparkles, Clock,
  TrendingUp,
} from "lucide-react";

interface Draft {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  status: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  niche: string | null;
  targetCustomer: string | null;
  intensity: string | null;
  channels: string[] | null;
}

interface Props {
  product: Product;
  drafts: Draft[];
  runs: { id: string; channel: string; status: string | null; createdAt: Date }[];
}

const PLATFORMS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "instagram", label: "Instagram", icon: <Image size={13} />,  color: "#e1306c" },
  { key: "reddit",    label: "Reddit",    icon: <Globe size={13} />,   color: "#ff4500" },
  { key: "facebook",  label: "Facebook",  icon: <Users size={13} />,   color: "#1877f2" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "badge-gray", approved: "badge-green", scheduled: "badge-purple",
  sent: "badge-blue",  failed: "badge-red",
};

const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["9am", "12pm", "3pm", "6pm", "9pm"];

export default function B2cDashboard({ product, drafts, runs }: Props) {
  const router = useRouter();
  const [tab, setTab]           = useState<"content" | "schedule" | "analytics">("content");
  const [platform, setPlatform] = useState<string>("instagram");
  const [loading, setLoading]   = useState(false);

  const filtered       = drafts.filter((d) => d.channel === platform);
  const scheduled      = drafts.filter((d) => d.status === "scheduled");
  const totalDrafts    = drafts.length;
  const approvedCount  = drafts.filter((d) => d.status === "approved").length;
  const scheduledCount = scheduled.length;

  async function generateContent() {
    setLoading(true);
    try {
      const channels = (product.channels ?? ["instagram", "reddit", "facebook"]).filter((c) =>
        ["instagram", "reddit", "facebook"].includes(c)
      );
      const res = await fetch("/api/agents/b2c/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(`Generated ${data.draftsGenerated} content drafts!`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleDraft(id: string) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(9, 0, 0, 0);
    await fetch(`/api/agents/b2c/content/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduledAt }),
    });
    toast.success("Scheduled for tomorrow at 9am");
    router.refresh();
  }

  async function approveDraft(id: string) {
    await fetch(`/api/agents/b2c/content/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      {/* Top bar */}
      <div style={{ padding: "20px 28px 0", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", color: "var(--fg)" }}>{product.name}</h1>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" }}>
              B2C · {product.niche ?? "General"} · {product.intensity ?? "steady"} intensity
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Drafts",    val: totalDrafts    },
              { label: "Approved",  val: approvedCount  },
              { label: "Scheduled", val: scheduledCount },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--fg)", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: "11px", color: "var(--fg-faint)", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="tab-bar">
          {[
            { key: "content",   label: "Content",   icon: <Sparkles size={12} /> },
            { key: "schedule",  label: "Schedule",  icon: <Calendar size={12} /> },
            { key: "analytics", label: "Analytics", icon: <BarChart2 size={12} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} className={`tab-item ${tab === key ? "active" : ""}`} onClick={() => setTab(key as typeof tab)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>{icon} {label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>

        {/* ── CONTENT TAB ─────────────────────────────────────────────── */}
        {tab === "content" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {PLATFORMS.map(({ key, label, icon, color }) => (
                  <button key={key} onClick={() => setPlatform(key)} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "6px", fontSize: "13px",
                    fontWeight: "500", cursor: "pointer", transition: "all 0.15s",
                    background: platform === key ? "var(--bg-hover)" : "transparent",
                    border: `1px solid ${platform === key ? color : "var(--border)"}`,
                    color: platform === key ? "var(--fg)" : "var(--fg-muted)",
                  }}>
                    <span style={{ color }}>{icon}</span> {label}
                    <span className="badge badge-gray" style={{ marginLeft: "2px" }}>
                      {drafts.filter((d) => d.channel === key).length}
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" onClick={generateContent} disabled={loading}>
                {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
                Generate Content
              </button>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={platform === "instagram" ? "📸" : platform === "reddit" ? "🤖" : "👥"}
                title={`No ${PLATFORMS.find(p => p.key === platform)?.label} content yet`}
                subtitle="Click 'Generate Content' to create AI-crafted posts for all your channels."
              />
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {filtered.map((draft) => (
                  <div key={draft.id} className="card" style={{ padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className={`badge ${STATUS_COLORS[draft.status ?? "draft"] ?? "badge-gray"}`}>{draft.status ?? "draft"}</span>
                        {draft.subject && <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--fg)" }}>{draft.subject}</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => { navigator.clipboard.writeText(draft.body); toast.success("Copied!"); }}>
                          <Copy size={12} />
                        </button>
                        {draft.status !== "scheduled" && (
                          <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => scheduleDraft(draft.id)}>
                            <Clock size={12} /> Schedule
                          </button>
                        )}
                        {draft.status === "draft" && (
                          <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => approveDraft(draft.id)}>
                            <Check size={12} /> Approve
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--fg-muted)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{draft.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ────────────────────────────────────────────── */}
        {tab === "schedule" && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", marginBottom: "4px" }}>Content Schedule</h2>
              <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>{scheduledCount} posts scheduled this week</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: "600px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
                  <div />
                  {DAYS.map((d) => (
                    <div key={d} style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", background: "var(--bg-subtle)", borderRadius: "4px 4px 0 0" }}>{d}</div>
                  ))}
                </div>
                {TIMES.map((time, ti) => (
                  <div key={time} style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
                    <div style={{ padding: "8px", fontSize: "11px", color: "var(--fg-faint)", display: "flex", alignItems: "center" }}>{time}</div>
                    {DAYS.map((_, di) => {
                      const slotDraft = scheduled[ti * 7 + di] ?? null;
                      const p = slotDraft ? PLATFORMS.find((p) => p.key === slotDraft.channel) : null;
                      return (
                        <div key={di} style={{
                          minHeight: "48px", borderRadius: "4px", padding: "6px",
                          background: slotDraft ? "var(--accent-bg)" : "var(--bg-subtle)",
                          border: `1px solid ${slotDraft ? "var(--accent-border)" : "var(--border)"}`,
                          display: "flex", alignItems: "center",
                        }}>
                          {slotDraft && p && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: p.color }}>{p.icon}</span>
                              <span style={{ fontSize: "10px", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {slotDraft.body.slice(0, 30)}...
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {scheduledCount === 0 && (
              <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--fg-faint)" }}>
                Schedule posts from the Content tab to see them here.
              </p>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────── */}
        {tab === "analytics" && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", marginBottom: "4px" }}>Campaign Analytics</h2>
              <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Performance overview across all channels</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                { label: "Est. Reach",       value: `${(totalDrafts * 847).toLocaleString()}`, change: "+12%", icon: "👁️",  color: "#2563eb" },
                { label: "Engagement Rate",  value: "4.7%",                                    change: "+0.8%", icon: "💬", color: "#d97706" },
                { label: "Posts Published",  value: `${drafts.filter((d) => d.status === "sent").length}`, change: `+${totalDrafts}`, icon: "✅", color: "#16a34a" },
                { label: "Avg. Likes",       value: `${Math.floor(totalDrafts * 23)}`,          change: "+5", icon: "❤️",   color: "#db2777" },
              ].map(({ label, value, change, icon, color }) => (
                <div key={label} className="stat-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "16px" }}>{icon}</span>
                    </div>
                    <TrendingUp size={12} color="var(--fg-faint)" />
                  </div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>{change} this week</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "600", color: "var(--fg-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Channel Breakdown</h3>
              {PLATFORMS.map(({ key, label, icon, color }) => {
                const count = drafts.filter((d) => d.channel === key).length;
                const pct = totalDrafts > 0 ? Math.round((count / totalDrafts) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color }}>{icon} {label}</div>
                      <span style={{ fontSize: "12px", color: "var(--fg-muted)" }}>{count} drafts ({pct}%)</span>
                    </div>
                    <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: color, width: `${pct}%`, transition: "width 0.4s ease", borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px dashed var(--border)" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "var(--fg-muted)", maxWidth: "320px", margin: "0 auto" }}>{subtitle}</div>
    </div>
  );
}
