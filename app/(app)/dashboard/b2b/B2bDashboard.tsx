"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users, Mail, Briefcase, Play, RefreshCw, Check, Copy,
  Loader2, ChevronDown, ChevronUp, X, ExternalLink,
  TrendingUp, Target, Sparkles, Settings2,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  status: string | null;
  createdAt: Date;
}

interface Draft {
  id: string;
  leadId: string | null;
  channel: string;
  subject: string | null;
  body: string;
  status: string | null;
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  targetTitles: string[] | null;
  targetIndustry: string | null;
  targetSizes: string[] | null;
  keywords: string[] | null;
  painPoint: string | null;
  channels: string[] | null;
  scope: string[] | null;
  budgetMin: number | null;
  budgetMax: number | null;
}

interface Props {
  product: Product;
  leads: Lead[];
  drafts: Draft[];
  runs: { id: string; channel: string; status: string | null; createdAt: Date }[];
  activeTab?: string;
}

const SCRAPE_STEPS = [
  { key: "init",    label: "Initializing scraping job...",            icon: "🔧" },
  { key: "search",  label: "Searching Apollo for prospects...",       icon: "🔍" },
  { key: "filter",  label: "Filtering by industry & company size...", icon: "⚙️" },
  { key: "extract", label: "Extracting contact information...",       icon: "📊" },
  { key: "save",    label: "Saving leads to your database...",        icon: "💾" },
  { key: "done",    label: "Scraping complete!",                      icon: "✅" },
];

type ScrapeStatus = "idle" | "running" | "done" | "error";

const STATUS_COLORS: Record<string, string> = {
  new: "badge-blue", contacted: "badge-amber", replied: "badge-green",
  bounced: "badge-red", draft: "badge-gray", approved: "badge-green",
  scheduled: "badge-purple", sent: "badge-blue", failed: "badge-red",
};

export default function B2bDashboard({ product, leads, drafts, runs, activeTab = "overview" }: Props) {
  const router = useRouter();

  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [scrapeStep, setScrapeStep]     = useState(0);
  const [scrapeResult, setScrapeResult] = useState<{ found: number } | null>(null);
  const [genLoading, setGenLoading]     = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

  const [scrapeSettings, setScrapeSettings] = useState({
    titles:   product.targetTitles  ?? [],
    industry: product.targetIndustry ?? "",
    sizes:    product.targetSizes   ?? [],
    keywords: product.keywords      ?? [],
    limit:    20,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingInput, setSettingInput] = useState("");

  const emailDrafts    = drafts.filter((d) => d.channel === "cold-email");
  const linkedinDrafts = drafts.filter((d) => d.channel === "linkedin");
  const approvedCount  = emailDrafts.filter((d) => d.status === "approved").length;

  function goTab(t: string) { router.push(`/dashboard/b2b?tab=${t}`); }

  async function runScraping() {
    if (scrapeStatus === "running") return;
    setScrapeStatus("running");
    setScrapeStep(0);
    setScrapeResult(null);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < SCRAPE_STEPS.length - 1) setScrapeStep(step);
    }, 1800);

    try {
      const res  = await fetch("/api/agents/leads/run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings: scrapeSettings }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (!data.ok) throw new Error(data.error ?? "Scraping failed");
      setScrapeStep(SCRAPE_STEPS.length - 1);
      setScrapeStatus("done");
      setScrapeResult({ found: data.leadsFound ?? 0 });
      toast.success(`Scraped ${data.leadsFound ?? 0} leads!`);
      setTimeout(() => router.refresh(), 500);
    } catch (err: unknown) {
      clearInterval(interval);
      setScrapeStatus("error");
      toast.error(err instanceof Error ? err.message : "Scraping failed");
    }
  }

  async function generateDrafts() {
    setGenLoading(true);
    try {
      const res  = await fetch("/api/agents/drafts/generate", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(`Generated ${data.draftsGenerated} email drafts`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setGenLoading(false); }
  }

  async function generateLinkedin() {
    setLinkedinLoading(true);
    try {
      const res  = await fetch("/api/agents/b2b/run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "linkedin" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("LinkedIn post generated!");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setLinkedinLoading(false); }
  }

  async function updateDraft(id: string, update: object) {
    await fetch(`/api/agents/drafts/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(update),
    });
    router.refresh();
  }

  function copyText(t: string) { navigator.clipboard.writeText(t); toast.success("Copied!"); }

  const s = (style: React.CSSProperties) => style;

  return (
    <div style={s({ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" })}>
      {/* Page header — no tabs, just title */}
      <div style={s({ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" })}>
        <h1 style={s({ fontSize: "18px", fontWeight: "700", color: "var(--fg)" })}>{product.name}</h1>
        <p style={s({ fontSize: "12px", color: "var(--fg-muted)", marginTop: "3px" })}>
          B2B · {product.type?.toUpperCase() ?? "SaaS"} · {product.scope?.join(", ") ?? "Global"}
        </p>
      </div>

      {/* Content */}
      <div style={s({ flex: 1, overflow: "auto", padding: "24px 28px" })}>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div style={s({ display: "flex", flexDirection: "column", gap: "20px" })}>
            <div style={s({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" })}>
              {[
                { label: "Total Leads",    value: leads.length,          icon: <Users size={16} />,        color: "#2563eb" },
                { label: "Email Drafts",   value: emailDrafts.length,    icon: <Mail size={16} />,         color: "#d97706" },
                { label: "Approved",       value: approvedCount,         icon: <CheckCircle2 size={16} />, color: "#16a34a" },
                { label: "LinkedIn Posts", value: linkedinDrafts.length, icon: <Briefcase size={16} />,   color: "#7c3aed" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="stat-card">
                  <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" })}>
                    <div style={s({ width: "36px", height: "36px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color })}>{icon}</div>
                    <TrendingUp size={12} color="var(--fg-faint)" />
                  </div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={s({ padding: "20px" })}>
              <h3 style={s({ fontSize: "13px", fontWeight: "600", color: "var(--fg-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" })}>Product Details</h3>
              <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" })}>
                {[
                  { label: "Name",          val: product.name },
                  { label: "Type",          val: product.type?.toUpperCase() ?? "—" },
                  { label: "Target Titles", val: product.targetTitles?.slice(0, 3).join(", ") || "—" },
                  { label: "Industry",      val: product.targetIndustry || "—" },
                  { label: "Company Sizes", val: product.targetSizes?.join(", ") || "—" },
                  { label: "Budget",        val: product.budgetMin != null ? `$${product.budgetMin}–$${product.budgetMax}/mo` : "—" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={s({ fontSize: "11px", color: "var(--fg-faint)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "3px" })}>{label}</div>
                    <div style={s({ fontSize: "13px", color: "var(--fg)", fontWeight: "500" })}>{val}</div>
                  </div>
                ))}
              </div>
              {product.painPoint && (
                <div style={s({ marginTop: "16px", padding: "12px", background: "var(--accent-bg)", borderRadius: "7px", border: "1px solid var(--accent-border)" })}>
                  <div style={s({ fontSize: "11px", color: "var(--accent)", fontWeight: "600", marginBottom: "4px" })}>PAIN POINT</div>
                  <div style={s({ fontSize: "13px", color: "var(--fg)", lineHeight: "1.5" })}>{product.painPoint}</div>
                </div>
              )}
            </div>

            <div className="card" style={s({ padding: "20px" })}>
              <h3 style={s({ fontSize: "13px", fontWeight: "600", color: "var(--fg-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" })}>Quick Actions</h3>
              <div style={s({ display: "flex", gap: "10px", flexWrap: "wrap" })}>
                <button className="btn btn-primary"   onClick={() => goTab("leads")}><Target size={13} /> Run Lead Gen</button>
                <button className="btn btn-secondary" onClick={() => goTab("email")}><Mail size={13} /> Generate Emails</button>
                <button className="btn btn-secondary" onClick={() => goTab("linkedin")}><Briefcase size={13} /> LinkedIn Post</button>
              </div>
            </div>
          </div>
        )}

        {/* ── LEAD GEN ─────────────────────────────────────────────────── */}
        {activeTab === "leads" && (
          <div style={s({ display: "flex", flexDirection: "column", gap: "16px" })}>
            <div className="card" style={s({ overflow: "hidden" })}>
              <div style={s({ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" })} onClick={() => setShowSettings(!showSettings)}>
                <div style={s({ display: "flex", alignItems: "center", gap: "10px" })}>
                  <Settings2 size={15} color="var(--fg-muted)" />
                  <span style={s({ fontSize: "14px", fontWeight: "600", color: "var(--fg)" })}>Scraping Settings</span>
                  <span className="badge badge-gray">
                    {scrapeSettings.titles.length} titles · {scrapeSettings.industry || "any industry"} · limit {scrapeSettings.limit}
                  </span>
                </div>
                {showSettings ? <ChevronUp size={14} color="var(--fg-muted)" /> : <ChevronDown size={14} color="var(--fg-muted)" />}
              </div>

              {showSettings && (
                <div style={s({ padding: "0 20px 20px", borderTop: "1px solid var(--border)" })}>
                  <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" })}>
                    <div>
                      <label className="label">Target Job Titles</label>
                      <div style={s({ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "6px" })}>
                        {scrapeSettings.titles.map((t) => (
                          <span key={t} style={s({ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 8px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "999px", fontSize: "11px", fontWeight: "500" })}>
                            {t}
                            <button onClick={() => setScrapeSettings(s => ({ ...s, titles: s.titles.filter(x => x !== t) }))} style={s({ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", lineHeight: 1 })}>×</button>
                          </span>
                        ))}
                      </div>
                      <div style={s({ display: "flex", gap: "6px" })}>
                        <input className="input-field" placeholder="Add title..." value={settingInput} onChange={e => setSettingInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && settingInput.trim()) { setScrapeSettings(s => ({ ...s, titles: [...s.titles, settingInput.trim()] })); setSettingInput(""); } }}
                        />
                        <button className="btn btn-secondary" onClick={() => { if (settingInput.trim()) { setScrapeSettings(s => ({ ...s, titles: [...s.titles, settingInput.trim()] })); setSettingInput(""); } }}>Add</button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Industry</label>
                      <input className="input-field" value={scrapeSettings.industry} onChange={e => setScrapeSettings(s => ({ ...s, industry: e.target.value }))} placeholder="e.g. FinTech, SaaS..." />
                    </div>
                    <div>
                      <label className="label">Company Sizes</label>
                      <div style={s({ display: "flex", gap: "6px", flexWrap: "wrap" })}>
                        {["1–10", "11–50", "51–200", "201–1000", "1000+"].map(size => (
                          <button key={size} onClick={() => setScrapeSettings(s => ({ ...s, sizes: s.sizes.includes(size) ? s.sizes.filter(x => x !== size) : [...s.sizes, size] }))}
                            style={s({ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer", border: "1px solid var(--border)",
                              background: scrapeSettings.sizes.includes(size) ? "var(--accent)" : "var(--bg-subtle)",
                              color:      scrapeSettings.sizes.includes(size) ? "#fff"          : "var(--fg-muted)",
                            })}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Max Results</label>
                      <input className="input-field" type="number" min={5} max={50} value={scrapeSettings.limit} onChange={e => setScrapeSettings(s => ({ ...s, limit: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scrape trigger */}
            <div className="card" style={s({ padding: "20px" })}>
              {scrapeStatus === "idle" && (
                <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                  <div>
                    <div style={s({ fontSize: "14px", fontWeight: "600", color: "var(--fg)", marginBottom: "4px" })}>Start Lead Scraping</div>
                    <div style={s({ fontSize: "12px", color: "var(--fg-muted)" })}>Scrape up to {scrapeSettings.limit} prospects matching your targeting settings</div>
                  </div>
                  <button className="btn btn-primary" onClick={runScraping}><Play size={14} /> Start Scraping</button>
                </div>
              )}

              {scrapeStatus === "running" && (
                <div style={s({ animation: "fadeIn 0.3s ease" })}>
                  <div style={s({ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" })}>
                    <Loader2 size={16} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
                    <span style={s({ fontSize: "14px", fontWeight: "600", color: "var(--fg)" })}>Scraping in progress...</span>
                  </div>
                  <div style={s({ display: "flex", flexDirection: "column", gap: "10px" })}>
                    {SCRAPE_STEPS.slice(0, -1).map((step, i) => (
                      <div key={step.key} style={s({ display: "flex", alignItems: "center", gap: "10px" })}>
                        <div style={s({ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          background: i < scrapeStep ? "var(--accent)" : i === scrapeStep ? "var(--accent-bg)" : "var(--bg-subtle)",
                          border: `2px solid ${i <= scrapeStep ? "var(--accent)" : "var(--border)"}`,
                        })}>
                          {i < scrapeStep
                            ? <Check size={12} color="#fff" />
                            : i === scrapeStep
                              ? <Loader2 size={10} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
                              : <Circle size={10} color="var(--fg-faint)" />
                          }
                        </div>
                        <span style={s({ fontSize: "13px", color: i <= scrapeStep ? "var(--fg)" : "var(--fg-faint)", fontWeight: i === scrapeStep ? "600" : "400" })}>
                          {step.icon} {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scrapeStatus === "done" && (
                <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 0.3s ease" })}>
                  <div style={s({ display: "flex", alignItems: "center", gap: "12px" })}>
                    <div style={s({ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center" })}>
                      <CheckCircle2 size={20} color="#16a34a" />
                    </div>
                    <div>
                      <div style={s({ fontSize: "14px", fontWeight: "600", color: "var(--fg)" })}>Scraping complete</div>
                      <div style={s({ fontSize: "12px", color: "var(--fg-muted)" })}>{scrapeResult?.found ?? 0} leads added to your database</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setScrapeStatus("idle")}><RefreshCw size={13} /> Run Again</button>
                </div>
              )}

              {scrapeStatus === "error" && (
                <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                  <div style={s({ display: "flex", alignItems: "center", gap: "10px" })}>
                    <AlertCircle size={18} color="var(--red)" />
                    <span style={s({ fontSize: "13px", color: "var(--red)" })}>Scraping failed. Check your Apify token and actor settings.</span>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setScrapeStatus("idle")}>Try Again</button>
                </div>
              )}
            </div>

            {leads.length > 0 && (
              <div>
                <div style={s({ fontSize: "13px", fontWeight: "600", color: "var(--fg-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" })}>
                  {leads.length} Prospects
                </div>
                <div style={s({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" })}>
                  {leads.map((lead) => (
                    <div key={lead.id} className="card" style={s({ padding: "16px", cursor: "pointer", transition: "all 0.15s", border: "1px solid var(--border)" })}
                      onClick={() => setSelectedLead(lead)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div style={s({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" })}>
                        <div style={s({ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 })}>
                          <span style={s({ fontSize: "14px", fontWeight: "700", color: "var(--accent)" })}>{(lead.name ?? "?")[0].toUpperCase()}</span>
                        </div>
                        <span className={`badge ${STATUS_COLORS[lead.status ?? "new"] ?? "badge-gray"}`}>{lead.status ?? "new"}</span>
                      </div>
                      <div style={s({ fontSize: "14px", fontWeight: "600", color: "var(--fg)", marginBottom: "3px" })}>{lead.name ?? "Unknown"}</div>
                      <div style={s({ fontSize: "12px", color: "var(--fg-muted)", marginBottom: "2px" })}>{lead.title ?? "—"}</div>
                      <div style={s({ fontSize: "12px", color: "var(--fg-faint)" })}>{lead.company ?? "—"}</div>
                      {lead.email && <div style={s({ marginTop: "10px", fontSize: "11px", color: "var(--accent)", fontWeight: "500" })}>{lead.email}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {leads.length === 0 && scrapeStatus === "idle" && (
              <EmptyState icon="🎯" title="No leads yet" subtitle="Configure your targeting above and click 'Start Scraping' to find prospects." />
            )}
          </div>
        )}

        {/* ── COLD EMAIL ───────────────────────────────────────────────── */}
        {activeTab === "email" && (
          <div>
            <div style={s({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" })}>
              <div>
                <h2 style={s({ fontSize: "15px", fontWeight: "600", color: "var(--fg)" })}>Cold Email Drafts</h2>
                <p style={s({ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" })}>AI-personalized emails for each lead</p>
              </div>
              <button className="btn btn-primary" onClick={generateDrafts} disabled={genLoading || leads.length === 0}>
                {genLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                Generate Drafts
              </button>
            </div>

            {leads.length === 0 && (
              <div style={s({ marginBottom: "16px", padding: "12px 14px", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: "8px", fontSize: "13px", color: "var(--accent)" })}>
                ⚡ Run Lead Gen first to scrape prospects, then generate personalized emails for each one.
              </div>
            )}

            {emailDrafts.length === 0
              ? <EmptyState icon="📧" title="No drafts yet" subtitle="Generate AI-crafted cold emails personalized for each lead." />
              : (
                <div style={s({ display: "flex", flexDirection: "column", gap: "10px" })}>
                  {emailDrafts.map((draft) => (
                    <div key={draft.id} className="card" style={s({ padding: "16px" })}>
                      <div style={s({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" })}>
                        <div style={s({ flex: 1, minWidth: 0 })}>
                          <div style={s({ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" })}>
                            <span className={`badge ${STATUS_COLORS[draft.status ?? "draft"] ?? "badge-gray"}`}>{draft.status ?? "draft"}</span>
                            {draft.subject && <span style={s({ fontSize: "13px", fontWeight: "600", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{draft.subject}</span>}
                          </div>
                          <p style={s({ fontSize: "12px", color: "var(--fg-muted)", lineHeight: "1.6", whiteSpace: "pre-wrap",
                            display: expandedDraft === draft.id ? "block" : "-webkit-box",
                            WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                          })}>
                            {draft.body}
                          </p>
                        </div>
                        <div style={s({ display: "flex", gap: "5px", flexShrink: 0 })}>
                          <button className="btn btn-ghost" style={s({ padding: "6px 8px" })} onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}>
                            {expandedDraft === draft.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <button className="btn btn-ghost" style={s({ padding: "6px 8px" })} onClick={() => copyText(`${draft.subject ? draft.subject + "\n\n" : ""}${draft.body}`)}>
                            <Copy size={13} />
                          </button>
                          {draft.status !== "approved" && (
                            <button className="btn btn-secondary" style={s({ padding: "6px 10px", fontSize: "12px" })} onClick={() => updateDraft(draft.id, { status: "approved" })}>
                              <Check size={12} /> Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── LINKEDIN ─────────────────────────────────────────────────── */}
        {activeTab === "linkedin" && (
          <div>
            <div style={s({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" })}>
              <div>
                <h2 style={s({ fontSize: "15px", fontWeight: "600", color: "var(--fg)" })}>LinkedIn Content</h2>
                <p style={s({ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" })}>AI-generated thought leadership posts to build inbound</p>
              </div>
              <button className="btn btn-primary" onClick={generateLinkedin} disabled={linkedinLoading}>
                {linkedinLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                Generate Post
              </button>
            </div>

            {linkedinDrafts.length === 0
              ? <EmptyState icon="💼" title="No LinkedIn posts yet" subtitle="Generate AI-written posts to attract B2B buyers and build authority." />
              : (
                <div style={s({ display: "flex", flexDirection: "column", gap: "10px" })}>
                  {linkedinDrafts.map((draft) => (
                    <div key={draft.id} className="card" style={s({ padding: "20px" })}>
                      <div style={s({ display: "flex", justifyContent: "space-between", marginBottom: "12px" })}>
                        <span className={`badge ${STATUS_COLORS[draft.status ?? "draft"] ?? "badge-gray"}`}>{draft.status ?? "draft"}</span>
                        <div style={s({ display: "flex", gap: "6px" })}>
                          <button className="btn btn-ghost" style={s({ padding: "5px 9px" })} onClick={() => copyText(draft.body)}><Copy size={12} /> Copy</button>
                          {draft.status !== "approved" && (
                            <button className="btn btn-secondary" style={s({ padding: "5px 10px", fontSize: "12px" })} onClick={() => updateDraft(draft.id, { status: "approved" })}>
                              <Check size={12} /> Approve
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={s({ fontSize: "14px", color: "var(--fg)", lineHeight: "1.8", whiteSpace: "pre-wrap" })}>{draft.body}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div style={s({ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "24px" })}
          onClick={() => setSelectedLead(null)}
        >
          <div className="card" style={s({ width: "100%", maxWidth: "480px", padding: "24px", animation: "fadeIn 0.2s ease" })}
            onClick={e => e.stopPropagation()}
          >
            <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" })}>
              <div style={s({ display: "flex", alignItems: "center", gap: "12px" })}>
                <div style={s({ width: "44px", height: "44px", borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" })}>
                  <span style={s({ fontSize: "18px", fontWeight: "700", color: "var(--accent)" })}>{(selectedLead.name ?? "?")[0].toUpperCase()}</span>
                </div>
                <div>
                  <div style={s({ fontSize: "16px", fontWeight: "700", color: "var(--fg)" })}>{selectedLead.name ?? "Unknown"}</div>
                  <div style={s({ fontSize: "13px", color: "var(--fg-muted)" })}>{selectedLead.title ?? "—"}</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={s({ padding: "6px" })} onClick={() => setSelectedLead(null)}><X size={16} /></button>
            </div>

            <div style={s({ display: "flex", flexDirection: "column", gap: "10px" })}>
              {[
                { label: "Company", val: selectedLead.company },
                { label: "Email",   val: selectedLead.email },
                { label: "Status",  val: selectedLead.status ?? "new" },
                { label: "Source",  val: "Apollo / Apify" },
                { label: "Added",   val: new Date(selectedLead.createdAt).toLocaleDateString() },
              ].filter(x => x.val).map(({ label, val }) => (
                <div key={label} style={s({ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-subtle)", borderRadius: "7px" })}>
                  <span style={s({ fontSize: "12px", color: "var(--fg-muted)", fontWeight: "600" })}>{label}</span>
                  <span style={s({ fontSize: "13px", color: "var(--fg)", fontWeight: "500" })}>{val}</span>
                </div>
              ))}
              {selectedLead.linkedinUrl && (
                <a href={selectedLead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={s({ justifyContent: "center", marginTop: "4px" })}>
                  <ExternalLink size={13} /> View LinkedIn Profile
                </a>
              )}
            </div>

            <div style={s({ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" })}>
              <button className="btn btn-primary" style={s({ flex: 1, justifyContent: "center" })} onClick={() => { goTab("email"); setSelectedLead(null); }}>
                <Mail size={13} /> Write Email
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px dashed var(--border)" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--fg)", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "var(--fg-muted)", maxWidth: "300px", margin: "0 auto" }}>{subtitle}</div>
    </div>
  );
}
