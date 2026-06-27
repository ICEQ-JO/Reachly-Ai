"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Loader2, Zap } from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────────────── */
type ProductType = "saas" | "paas" | "";
type Audience = "b2b" | "b2c" | "";
type Intensity = "light" | "steady" | "aggressive" | "";

interface WizardState {
  // Shared
  name: string;
  description: string;
  type: ProductType;
  audience: Audience;
  scope: string[];
  budgetMin: number;
  budgetMax: number;
  companyStage: string;
  channels: string[];
  // B2B
  targetTitles: string[];
  targetIndustry: string;
  targetSizes: string[];
  keywords: string[];
  painPoint: string;
  differentiator: string;
  // B2C
  targetCustomer: string;
  niche: string;
  offering: string;
  tone: string;
  appType: string;
  goals: string[];
  intensity: Intensity;
}

const INITIAL: WizardState = {
  name: "", description: "", type: "", audience: "", scope: [], budgetMin: 500, budgetMax: 2000,
  companyStage: "early", channels: [],
  targetTitles: [], targetIndustry: "", targetSizes: [], keywords: [], painPoint: "", differentiator: "",
  targetCustomer: "", niche: "", offering: "", tone: "professional", appType: "", goals: [], intensity: "steady",
};

/* ── Helper components ───────────────────────────────────────────────────── */
function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.15s",
        background: selected ? "#f59e0b" : "#27272a",
        color: selected ? "#000" : "#a1a1aa",
        border: selected ? "1px solid #f59e0b" : "1px solid #3f3f46",
      }}
    >
      {label}
    </button>
  );
}

function BigCard({
  icon, title, subtitle, selected, onClick,
}: {
  icon: string; title: string; subtitle: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "24px",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.15s",
        background: selected ? "rgba(245,158,11,0.08)" : "#18181b",
        border: selected ? "2px solid #f59e0b" : "2px solid #27272a",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "28px" }}>{icon}</span>
      <span style={{ fontSize: "15px", fontWeight: "600", color: "#fafafa" }}>{title}</span>
      <span style={{ fontSize: "12px", color: "#71717a", lineHeight: "1.5" }}>{subtitle}</span>
      {selected && (
        <div style={{ marginTop: "4px" }}>
          <Check size={14} color="#f59e0b" />
        </div>
      )}
    </button>
  );
}

function TagInput({
  values, onChange, placeholder,
}: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-secondary" onClick={add}>Add</button>
      </div>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {values.map((v) => (
            <span
              key={v}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#d97706", lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Steps config ─────────────────────────────────────────────────────────── */
const SHARED_STEPS = ["name", "description", "type", "audience", "scope", "budget"];
const B2B_STEPS    = ["b2b-targeting", "b2b-icp", "review"];
const B2C_STEPS    = ["b2c-targeting", "review"];

function getSteps(audience: Audience) {
  if (audience === "b2b") return [...SHARED_STEPS, ...B2B_STEPS];
  if (audience === "b2c") return [...SHARED_STEPS, ...B2C_STEPS];
  return [...SHARED_STEPS, "review"];
}

function canAdvance(step: string, s: WizardState): boolean {
  switch (step) {
    case "name":         return s.name.trim().length >= 2;
    case "description":  return s.description.trim().length >= 10;
    case "type":         return s.type !== "";
    case "audience":     return s.audience !== "";
    case "scope":        return s.scope.length > 0;
    case "budget":       return true;
    case "b2b-targeting":return s.targetTitles.length > 0;
    case "b2b-icp":      return s.painPoint.trim().length >= 5;
    case "b2c-targeting":return s.targetCustomer.trim().length >= 3;
    default:             return true;
  }
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [s, setS] = useState<WizardState>(INITIAL);
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const steps = getSteps(s.audience);
  const currentStep = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const progress = ((stepIdx + 1) / steps.length) * 100;

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArr<K extends keyof WizardState>(key: K, val: string) {
    const arr = (s[key] as string[]) ?? [];
    update(key, (arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]) as WizardState[K]);
  }

  function next() {
    if (!canAdvance(currentStep, s)) return;
    if (isLast) { submit(); return; }
    setStepIdx((i) => i + 1);
  }

  function back() { if (stepIdx > 0) setStepIdx((i) => i - 1); }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Failed to save");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  /* ── Step content ──────────────────────────────────────────────────────── */
  function renderStep() {
    switch (currentStep) {
      case "name":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>What's your product called?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Give it a name — this is how it'll appear in campaigns.</p>
            <input
              className="input-field"
              style={{ fontSize: "18px", padding: "14px 16px" }}
              placeholder="e.g. Acme AI, LaunchKit, DataPulse..."
              value={s.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
            />
          </div>
        );

      case "description":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Describe your product</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>One or two sentences. What does it do? Who benefits?</p>
            <textarea
              className="input-field"
              style={{ minHeight: "120px", resize: "vertical", fontFamily: "inherit" }}
              placeholder="e.g. Acme AI helps startup founders automate their outreach and land their first 100 customers using AI agents."
              value={s.description}
              onChange={(e) => update("description", e.target.value)}
              autoFocus
            />
          </div>
        );

      case "type":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>What type of product is it?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>This affects how we position and distribute it.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <BigCard icon="☁️" title="SaaS" subtitle="Software as a Service — subscription-based, cloud-hosted, users pay monthly/annually." selected={s.type === "saas"} onClick={() => update("type", "saas")} />
              <BigCard icon="🔧" title="PaaS" subtitle="Platform as a Service — developer infrastructure, APIs, build tools, and SDKs." selected={s.type === "paas"} onClick={() => update("type", "paas")} />
            </div>
          </div>
        );

      case "audience":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Who are you selling to?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>This defines your entire distribution strategy.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <BigCard icon="🏢" title="B2B" subtitle="Businesses — startups, SMBs, enterprises. Lead gen, cold outreach, LinkedIn." selected={s.audience === "b2b"} onClick={() => update("audience", "b2b")} />
              <BigCard icon="👥" title="B2C" subtitle="Consumers — individuals, creators, small teams. Social media, communities, content." selected={s.audience === "b2c"} onClick={() => update("audience", "b2c")} />
            </div>
          </div>
        );

      case "scope":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Where are you targeting?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Select all that apply.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { val: "local", label: "🇯🇴 Local — Jordan / Palestine" },
                { val: "mena", label: "🌍 MENA — Middle East & North Africa" },
                { val: "global", label: "🌐 Global — Worldwide" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleArr("scope", val)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.15s",
                    background: s.scope.includes(val) ? "rgba(245,158,11,0.08)" : "#18181b",
                    border: s.scope.includes(val) ? "2px solid #f59e0b" : "2px solid #27272a",
                    color: s.scope.includes(val) ? "#fafafa" : "#a1a1aa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {label}
                  {s.scope.includes(val) && <Check size={14} color="#f59e0b" />}
                </button>
              ))}
            </div>
          </div>
        );

      case "budget":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Monthly marketing budget</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>This helps us recommend the right channels and intensity.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {[
                { min: 0,    max: 200,  label: "< $200" },
                { min: 200,  max: 500,  label: "$200–$500" },
                { min: 500,  max: 2000, label: "$500–$2k" },
                { min: 2000, max: 5000, label: "$2k–$5k" },
                { min: 5000, max: 99999,label: "$5k+" },
              ].map((b) => (
                <Pill
                  key={b.label}
                  label={b.label}
                  selected={s.budgetMin === b.min && s.budgetMax === b.max}
                  onClick={() => { update("budgetMin", b.min); update("budgetMax", b.max); }}
                />
              ))}
            </div>
            <div style={{ marginTop: "24px" }}>
              <label className="label">Company stage</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["idea", "early", "growing", "scaling"].map((stage) => (
                  <Pill key={stage} label={stage.charAt(0).toUpperCase() + stage.slice(1)} selected={s.companyStage === stage} onClick={() => update("companyStage", stage)} />
                ))}
              </div>
            </div>
          </div>
        );

      /* ── B2B steps ───────────────────────────────────────────────────── */
      case "b2b-targeting":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Who are your target prospects?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Define the job titles and company profile you want to reach.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="label">Target job titles</label>
                <TagInput values={s.targetTitles} onChange={(v) => update("targetTitles", v)} placeholder="e.g. CTO, VP Engineering, Head of Product..." />
              </div>
              <div>
                <label className="label">Target industry</label>
                <input className="input-field" placeholder="e.g. FinTech, HealthTech, E-commerce..." value={s.targetIndustry} onChange={(e) => update("targetIndustry", e.target.value)} />
              </div>
              <div>
                <label className="label">Company size</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["1–10", "11–50", "51–200", "201–1000", "1000+"].map((size) => (
                    <Pill key={size} label={size} selected={s.targetSizes.includes(size)} onClick={() => toggleArr("targetSizes", size)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Keywords (optional)</label>
                <TagInput values={s.keywords} onChange={(v) => update("keywords", v)} placeholder="e.g. SaaS, automation, AI..." />
              </div>
            </div>
          </div>
        );

      case "b2b-icp":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Your ideal customer profile</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>This powers your cold email and LinkedIn copy.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="label">Main pain point you solve</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
                  placeholder="e.g. Sales teams waste 3 hours a day on manual prospecting and still miss quota."
                  value={s.painPoint}
                  onChange={(e) => update("painPoint", e.target.value)}
                />
              </div>
              <div>
                <label className="label">What makes you different?</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
                  placeholder="e.g. Unlike Outreach, we use AI to write personalized emails in seconds — no templates, no cringe."
                  value={s.differentiator}
                  onChange={(e) => update("differentiator", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case "b2b-channels":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Choose your B2B channels</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Select the growth channels you want to activate.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { val: "lead-gen",   icon: "🎯", title: "Lead Generation",  sub: "Scrape targeted prospects from Apollo/LinkedIn using Apify" },
                { val: "cold-email", icon: "📧", title: "Cold Email",        sub: "AI-drafted personalized emails for each lead" },
                { val: "linkedin",   icon: "💼", title: "LinkedIn Content",  sub: "AI-generated posts to build authority and inbound" },
              ].map(({ val, icon, title, sub }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleArr("channels", val)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    background: s.channels.includes(val) ? "rgba(245,158,11,0.08)" : "#18181b",
                    border: s.channels.includes(val) ? "2px solid #f59e0b" : "2px solid #27272a",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{icon}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: s.channels.includes(val) ? "#fafafa" : "#a1a1aa" }}>{title}</div>
                    <div style={{ fontSize: "12px", color: "#71717a", marginTop: "2px" }}>{sub}</div>
                  </span>
                  {s.channels.includes(val) && <Check size={14} color="#f59e0b" />}
                </button>
              ))}
            </div>
          </div>
        );

      /* ── B2C steps ───────────────────────────────────────────────────── */
      case "b2c-targeting":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Who is your target customer?</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Help us understand who you're speaking to.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="label">Target customer</label>
                <input className="input-field" placeholder="e.g. Indie hackers, freelance designers, startup founders..." value={s.targetCustomer} onChange={(e) => update("targetCustomer", e.target.value)} />
              </div>
              <div>
                <label className="label">Your niche / community</label>
                <input className="input-field" placeholder="e.g. Productivity, design tools, developer tools..." value={s.niche} onChange={(e) => update("niche", e.target.value)} />
              </div>
              <div>
                <label className="label">Content tone</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["professional", "casual", "playful", "educational", "inspirational"].map((t) => (
                    <Pill key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} selected={s.tone === t} onClick={() => update("tone", t)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Campaign intensity</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { val: "light",      label: "🌱 Light",      sub: "2–3 posts/week" },
                    { val: "steady",     label: "📈 Steady",     sub: "5–7 posts/week" },
                    { val: "aggressive", label: "🚀 Aggressive",  sub: "Daily posting" },
                  ].map(({ val, label, sub }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => update("intensity", val as Intensity)}
                      style={{
                        flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer",
                        background: s.intensity === val ? "rgba(245,158,11,0.08)" : "#18181b",
                        border: s.intensity === val ? "2px solid #f59e0b" : "2px solid #27272a",
                        display: "flex", flexDirection: "column", gap: "4px", textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "600", color: s.intensity === val ? "#fafafa" : "#a1a1aa" }}>{label}</span>
                      <span style={{ fontSize: "11px", color: "#71717a" }}>{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "b2c-channels":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Choose your B2C channels</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Pick where you want to reach your audience.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { val: "instagram", icon: "📸", title: "Instagram",  sub: "Visual content, captions, and hashtag strategy" },
                { val: "reddit",    icon: "🤖", title: "Reddit",     sub: "Community-native posts that drive organic traffic" },
                { val: "facebook",  icon: "👥", title: "Facebook",   sub: "Posts optimized for engagement and shares" },
              ].map(({ val, icon, title, sub }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleArr("channels", val)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    background: s.channels.includes(val) ? "rgba(245,158,11,0.08)" : "#18181b",
                    border: s.channels.includes(val) ? "2px solid #f59e0b" : "2px solid #27272a",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{icon}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: s.channels.includes(val) ? "#fafafa" : "#a1a1aa" }}>{title}</div>
                    <div style={{ fontSize: "12px", color: "#71717a", marginTop: "2px" }}>{sub}</div>
                  </span>
                  {s.channels.includes(val) && <Check size={14} color="#f59e0b" />}
                </button>
              ))}
            </div>
          </div>
        );

      case "review":
        return (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Review & launch 🚀</h2>
            <p style={{ color: "#71717a", fontSize: "14px", marginBottom: "24px" }}>Everything looks good? We'll set up your campaigns and start generating content.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Product", value: `${s.name} (${s.type?.toUpperCase() ?? ""})` },
                { label: "Audience", value: s.audience?.toUpperCase() ?? "" },
                { label: "Scope", value: s.scope.join(", ") },
                { label: "Budget", value: `$${s.budgetMin}–$${s.budgetMax}/mo` },
                { label: "Channels", value: s.channels.join(", ") || "None selected" },
                ...(s.audience === "b2b" ? [
                  { label: "Target titles", value: s.targetTitles.join(", ") },
                  { label: "Industry", value: s.targetIndustry || "Any" },
                ] : [
                  { label: "Target customer", value: s.targetCustomer },
                  { label: "Niche", value: s.niche },
                  { label: "Intensity", value: s.intensity },
                ]),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#18181b",
                    borderRadius: "8px",
                    border: "1px solid #27272a",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#71717a" }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "#fafafa", fontWeight: "500" }}>{value}</span>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "13px", color: "#ef4444" }}>
                {error}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  const stepLabel: Record<string, string> = {
    name: "Product Name", description: "Description", type: "Product Type", audience: "Audience",
    scope: "Target Market", budget: "Budget",
    "b2b-targeting": "Prospect Profile", "b2b-icp": "ICP", "b2b-channels": "Channels",
    "b2c-targeting": "Audience", "b2c-channels": "Channels",
    review: "Review",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #27272a", padding: "16px 24px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "28px", height: "28px", background: "#f59e0b", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={14} color="#000" fill="#000" />
        </div>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#fafafa" }}>Reachly</span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#71717a" }}>
          Step {stepIdx + 1} of {steps.length} — {stepLabel[currentStep] ?? currentStep}
        </span>
      </div>

      {/* Progress */}
      <div style={{ height: "2px", background: "#27272a" }}>
        <div style={{ height: "100%", background: "#f59e0b", width: `${progress}%`, transition: "width 0.3s ease" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: "560px" }}>
          {renderStep()}
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ borderTop: "1px solid #27272a", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "608px", margin: "0 auto", width: "100%" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={back}
          disabled={stepIdx === 0}
          style={{ opacity: stepIdx === 0 ? 0 : 1 }}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={next}
          disabled={!canAdvance(currentStep, s) || submitting}
        >
          {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          {isLast ? "Launch Reachly 🚀" : <>Next <ChevronRight size={14} /></>}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
