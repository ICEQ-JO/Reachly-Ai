"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Briefcase, ArrowLeft, ArrowRight, Sparkles, Check, Loader2, Play } from "lucide-react";

const SCRAPE_STEPS = [
  { key: "init",    label: "Initializing scraping job...",            icon: "🔧" },
  { key: "search",  label: "Searching Apollo for prospects...",       icon: "🔍" },
  { key: "filter",  label: "Filtering by industry & company size...", icon: "⚙️" },
  { key: "extract", label: "Extracting contact information...",       icon: "📊" },
  { key: "save",    label: "Saving leads to your database...",        icon: "💾" },
  { key: "done",    label: "Scraping complete!",                      icon: "✅" },
];

const LINKEDIN_STEPS = [
  { key: "init",    label: "Initializing post generation...",         icon: "🔧" },
  { key: "analyze", label: "Analyzing ICP & product differentiators...", icon: "🧠" },
  { key: "draft1",  label: "Drafting organic social hook...",          icon: "✍️" },
  { key: "draft2",  label: "Structuring thought leadership value...",  icon: "💡" },
  { key: "save",    label: "Persisting drafts to vault...",           icon: "💾" },
  { key: "done",    label: "LinkedIn generation complete!",           icon: "✅" },
];

export default function NewB2bCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose-type" | "configure" | "running" | "done">("choose-type");
  const [campaignType, setCampaignType] = useState<"b2b-leads" | "b2b-linkedin">("b2b-leads");
  
  // Campaign configurations
  const [name, setName] = useState("");
  
  // Lead gen config
  const [titles, setTitles] = useState<string[]>(["Founder", "CTO", "CEO"]);
  const [industry, setIndustry] = useState("Technology");
  const [sizes, setSizes] = useState<string[]>(["1-10", "11-50"]);
  const [keywords, setKeywords] = useState<string[]>(["AI", "SaaS"]);
  const [limit, setLimit] = useState(20);
  
  // LinkedIn config
  const [focus, setFocus] = useState("Thought Leadership");
  const [extraNotes, setExtraNotes] = useState("");
  const [postCount, setPostCount] = useState(3);

  // Running state
  const [runningStep, setRunningStep] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);

  // Inputs helper
  const [tempTitle, setTempTitle] = useState("");
  const [tempKeyword, setTempKeyword] = useState("");

  async function handleStartCampaign() {
    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setStep("running");
    setRunningStep(0);

    const stepsList = campaignType === "b2b-leads" ? SCRAPE_STEPS : LINKEDIN_STEPS;
    let currentStepIdx = 0;
    
    // Simulate steps progress visually
    const interval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < stepsList.length - 1) {
        setRunningStep(currentStepIdx);
      }
    }, 2000);

    try {
      const res = await fetch("/api/campaigns/b2b/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: campaignType,
          settings: campaignType === "b2b-leads" ? {
            titles,
            industry,
            sizes,
            keywords,
            limit,
          } : {
            focus,
            extraNotes,
            postCount,
          }
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) throw new Error(data.error || "Campaign launch failed");

      setCampaignId(data.campaignId);
      if (campaignType === "b2b-leads") {
        setScrapedCount(data.leadsFound || 0);
      } else {
        setDraftsCount(data.draftsGenerated || 0);
      }

      setRunningStep(stepsList.length - 1);
      setStep("done");
      toast.success("Campaign executed successfully!");
    } catch (err) {
      clearInterval(interval);
      toast.error(String(err));
      setStep("configure");
    }
  }

  return (
    <div style={{ padding: "32px", maxWidth: "680px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "13px", marginBottom: "24px", padding: 0 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* ─────────────────────────────── Choose Campaign Type */}
      {step === "choose-type" && (
        <div>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--fg)", marginBottom: "6px" }}>New B2B Campaign</h1>
            <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Select the type of campaign you want to orchestrate.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            <button onClick={() => { setCampaignType("b2b-leads"); setStep("configure"); }} style={{
              display: "flex", alignItems: "center", gap: "16px", padding: "20px", borderRadius: "12px",
              border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
            }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>Lead Prospecting Scraper</div>
                <div style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "3px", lineHeight: "1.4" }}>
                  Define target job titles, company size, and industries to scrape cold emails and prospect metadata from Apollo.
                </div>
              </div>
            </button>

            <button onClick={() => { setCampaignType("b2b-linkedin"); setStep("configure"); }} style={{
              display: "flex", alignItems: "center", gap: "16px", padding: "20px", borderRadius: "12px",
              border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
            }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                <Briefcase size={22} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--fg)" }}>LinkedIn Post Campaign</div>
                <div style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "3px", lineHeight: "1.4" }}>
                  Generate tailored thought leadership, product launch, or educational posts specifically formatted for LinkedIn.
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────── Configure Campaign */}
      {step === "configure" && (
        <div>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--fg)", marginBottom: "6px" }}>
              Configure {campaignType === "b2b-leads" ? "Lead Prospecting" : "LinkedIn Post"} Campaign
            </h1>
            <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Specify targeting details and details for the agent run.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Campaign Name</label>
              <input
                className="input-field"
                placeholder="e.g. Q3 CTO Outreach, SaaS Founders Post Blast..."
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: "100%", fontSize: "14px" }}
              />
            </div>

            {campaignType === "b2b-leads" ? (
              <>
                {/* Scraping configurations */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Target Job Titles</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {titles.map(t => (
                      <span key={t} className="badge badge-blue" style={{ padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                        {t}
                        <button onClick={() => setTitles(titles.filter(x => x !== t))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: "11px" }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input className="input-field" style={{ flex: 1, fontSize: "13px" }} placeholder="Add job title..." value={tempTitle} onChange={e => setTempTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && tempTitle.trim()) { setTitles([...titles, tempTitle.trim()]); setTempTitle(""); } }} />
                    <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => { if (tempTitle.trim()) { setTitles([...titles, tempTitle.trim()]); setTempTitle(""); } }}>Add</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Industry Focus</label>
                  <input className="input-field" style={{ width: "100%", fontSize: "13px" }} value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Software, Venture Capital, Healthcare..." />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Keywords</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {keywords.map(k => (
                      <span key={k} className="badge badge-purple" style={{ padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                        {k}
                        <button onClick={() => setKeywords(keywords.filter(x => x !== k))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: "11px" }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input className="input-field" style={{ flex: 1, fontSize: "13px" }} placeholder="Add keyword..." value={tempKeyword} onChange={e => setTempKeyword(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && tempKeyword.trim()) { setKeywords([...keywords, tempKeyword.trim()]); setTempKeyword(""); } }} />
                    <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => { if (tempKeyword.trim()) { setKeywords([...keywords, tempKeyword.trim()]); setTempKeyword(""); } }}>Add</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Search Limit (leads)</label>
                  <input type="number" className="input-field" style={{ width: "100px", fontSize: "13px" }} value={limit} onChange={e => setLimit(Number(e.target.value))} min={5} max={100} />
                </div>
              </>
            ) : (
              <>
                {/* LinkedIn configuration */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Campaign Post Style</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {["Thought Leadership", "Product Launch / Promo", "Lessons & Stories", "Industry Insights"].map(opt => (
                      <button key={opt} onClick={() => setFocus(opt)}
                        style={{ padding: "11px", borderRadius: "8px", border: `2px solid ${focus === opt ? "var(--accent)" : "var(--border)"}`, background: focus === opt ? "var(--accent-bg)" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: focus === opt ? "var(--accent)" : "var(--fg)" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Additional Context / Focus Angle</label>
                  <textarea className="input-field" style={{ width: "100%", minHeight: "80px", fontSize: "13px", resize: "vertical" }}
                    placeholder="Provide specific angles: e.g. 'focus on our bootstrap journey' or 'talk about why SaaS billing is broken'"
                    value={extraNotes}
                    onChange={e => setExtraNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Number of Posts to Generate</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[1, 3, 5].map(cnt => (
                      <button key={cnt} onClick={() => setPostCount(cnt)}
                        style={{ padding: "8px 18px", borderRadius: "6px", border: `2px solid ${postCount === cnt ? "var(--accent)" : "var(--border)"}`, background: postCount === cnt ? "var(--accent-bg)" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: postCount === cnt ? "var(--accent)" : "var(--fg)" }}>
                        {cnt} Posts
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: "12px" }} onClick={() => setStep("choose-type")}>Back to Type</button>
            <button className="btn btn-primary" style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={handleStartCampaign}>
              <Play size={14} /> Start Campaign
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────── Campaign Run Status (Progress) */}
      {step === "running" && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", padding: "20px 0", width: "100%" }}>
          <div className="card" style={{ padding: "40px", maxWidth: "540px", width: "100%", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: "16px", background: "var(--bg)" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--fg)", marginBottom: "12px" }}>Executing Campaign Agents…</h2>
            <p style={{ fontSize: "14px", color: "var(--fg-muted)", marginBottom: "28px" }}>
              Your background agents are executing tasks. This might take 15–30 seconds.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", maxWidth: "420px", margin: "0 auto" }}>
              {(campaignType === "b2b-leads" ? SCRAPE_STEPS : LINKEDIN_STEPS).map((s, idx) => {
                const active = idx === runningStep;
                const done = idx < runningStep;
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: active ? "var(--accent-bg)" : "var(--bg-subtle)", borderRadius: "12px", border: active ? "1px solid var(--accent)" : "1px solid var(--border)", opacity: done || active ? 1 : 0.5 }}>
                    <span style={{ fontSize: "18px" }}>{s.icon}</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: active ? "var(--accent)" : "var(--fg)" }}>{s.label}</span>
                    {active && <Loader2 size={16} color="var(--accent)" style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
                    {done && <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: "bold", fontSize: "16px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────── Done */}
      {step === "done" && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", padding: "20px 0", width: "100%" }}>
          <div className="card" style={{ padding: "40px", maxWidth: "540px", width: "100%", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: "16px", background: "var(--bg)" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#16a34a18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: "2px solid #16a34a40" }}>
              <Check size={36} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: "26px", fontWeight: "700", color: "var(--fg)", marginBottom: "12px" }}>Campaign Activated! 🎉</h2>
            
            {campaignType === "b2b-leads" ? (
              <p style={{ fontSize: "15px", color: "var(--fg-muted)", marginBottom: "32px", lineHeight: "1.5" }}>
                Successfully scraped and imported <strong>{scrapedCount}</strong> leads matching your ICP settings.
              </p>
            ) : (
              <p style={{ fontSize: "15px", color: "var(--fg-muted)", marginBottom: "32px", lineHeight: "1.5" }}>
                Generated <strong>{draftsCount}</strong> organic LinkedIn post drafts.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {campaignType === "b2b-leads" ? (
                <button className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: "600" }}
                  onClick={() => router.push(`/dashboard/b2b/vault?tab=leads&campaign=${campaignId}`)}>
                  Go to Leads Vault
                </button>
              ) : (
                <button className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: "600" }}
                  onClick={() => router.push(`/dashboard/b2b/linkedin?campaign=${campaignId}`)}>
                  View LinkedIn Drafts
                </button>
              )}
              <button className="btn btn-secondary" style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: "600" }}
                onClick={() => router.push("/dashboard/b2b/campaigns")}>
                Back to Campaigns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
