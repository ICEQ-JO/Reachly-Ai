"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, MessageCircle, ArrowLeft, ArrowRight, Sparkles, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Instagram } from "@/components/icons/Instagram";

interface PlatformStrategy {
  // Instagram
  contentType?: string;    // "reel" | "static" | "carousel"
  tone?: string;
  hashtagCount?: string;
  // Facebook
  postStyle?: string;      // "educational" | "promotional" | "story" | "question"
  desiredAction?: string;
  // Reddit
  subreddits?: string;
  postType?: string;       // "discussion" | "showhn" | "story"
  valueFirst?: string;
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#e1306c", bg: "#e1306c18", desc: "Visual content — reels, carousels, stories. Emotional & aspirational." },
  { id: "facebook",  label: "Facebook",  icon: Globe,     color: "#1877f2", bg: "#1877f218", desc: "Community-driven posts. Educational, promotional & conversational." },
  { id: "reddit",    label: "Reddit",    icon: MessageCircle, color: "#ff4500", bg: "#ff450018", desc: "Value-first discussions. Authentic & community-focused content." },
];

export default function NewB2cCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<"name-platforms" | "strategy" | "generating" | "done">("name-platforms");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [postCount, setPostCount] = useState(3);
  const [mediaType, setMediaType] = useState("mixed");
  const [strategyStep, setStrategyStep] = useState(0);
  const [strategies, setStrategies] = useState<Record<string, PlatformStrategy>>({});
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  function togglePlatform(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function updateStrategy(platform: string, field: string, value: string) {
    setStrategies(prev => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));
  }

  async function handleGenerate() {
    if (!name || selected.length === 0) {
      toast.error("Please enter a name and select at least one platform");
      return;
    }
    setLoading(true);
    setStep("generating");
    try {
      const res = await fetch("/api/campaigns/b2c/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platforms: selected, strategies, postCount, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaignId(data.campaignId);
      setGeneratedCount(data.draftsGenerated ?? 0);
      setStep("done");
    } catch (err) {
      toast.error(String(err));
      setStep("strategy");
    } finally {
      setLoading(false);
    }
  }

  const currentPlatform = selected[strategyStep];
  const currentPlatformInfo = PLATFORMS.find(p => p.id === currentPlatform);

  // ─────────────────────────────── Step: Name + Platforms
  if (step === "name-platforms") {
    return (
      <div style={{ padding: "32px", maxWidth: "680px" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "13px", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--fg)", marginBottom: "6px" }}>New Content Campaign</h1>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Name your campaign and choose which platforms to create content for.</p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Campaign Name</label>
          <input
            className="input-field"
            placeholder="e.g. Summer Launch, Product Hunt, Q3 Push..."
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: "100%", fontSize: "15px" }}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Select Platforms</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PLATFORMS.map(({ id, label, icon: Icon, color, bg, desc }) => {
              const active = selected.includes(id);
              return (
                <button key={id} onClick={() => togglePlatform(id)} style={{
                  display: "flex", alignItems: "center", gap: "14px", padding: "16px 18px", borderRadius: "10px",
                  border: `2px solid ${active ? color : "var(--border)"}`, background: active ? bg : "var(--bg)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
                }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--fg)" }}>{label}</div>
                    <div style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" }}>{desc}</div>
                  </div>
                  {active && <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" /></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campaign Settings: Post Volume & Format */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Number of Posts</label>
            <select
              value={postCount}
              onChange={e => setPostCount(Number(e.target.value))}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid var(--border)",
                background: "var(--bg)", color: "var(--fg)", fontSize: "14px", fontWeight: "500", outline: "none", cursor: "pointer"
              }}
            >
              {[1, 2, 3, 5, 7, 10].map(n => (
                <option key={n} value={n}>{n} post{n > 1 ? "s" : ""} per platform</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Media Type</label>
            <select
              value={mediaType}
              onChange={e => setMediaType(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid var(--border)",
                background: "var(--bg)", color: "var(--fg)", fontSize: "14px", fontWeight: "500", outline: "none", cursor: "pointer"
              }}
            >
              <option value="mixed">Mixed (Image & Reels/Video)</option>
              <option value="image">Only Posts / Images</option>
              <option value="video">Only Reels / Videos</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: "100%", padding: "13px" }}
          onClick={() => { if (!name.trim()) { toast.error("Enter a campaign name"); return; } if (selected.length === 0) { toast.error("Select at least one platform"); return; } setStep("strategy"); setStrategyStep(0); }}
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  // ─────────────────────────────── Step: Strategy per platform
  if (step === "strategy") {
    const strategy = strategies[currentPlatform] ?? {};
    return (
      <div style={{ padding: "32px", maxWidth: "680px" }}>
        <button onClick={() => strategyStep === 0 ? setStep("name-platforms") : setStrategyStep(s => s - 1)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "13px", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft size={14} /> {strategyStep === 0 ? "Back to platforms" : `Back to ${selected[strategyStep - 1]}`}
        </button>

        {/* Progress */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
          {selected.map((p, i) => {
            const info = PLATFORMS.find(x => x.id === p)!;
            return (
              <div key={p} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i <= strategyStep ? info.color : "var(--border)" }} />
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: currentPlatformInfo?.bg, display: "flex", alignItems: "center", justifyContent: "center", color: currentPlatformInfo?.color }}>
            {currentPlatformInfo && <currentPlatformInfo.icon size={22} />}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)" }}>{currentPlatformInfo?.label} Strategy</h1>
            <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>How should we craft content for this platform?</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "28px" }}>
          {currentPlatform === "instagram" && (
            <>
              <div>
                <label className="label">Content Format</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["Reel Caption", "Static Post", "Carousel"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("instagram", "contentType", opt)}
                      style={{ padding: "10px", borderRadius: "8px", border: `2px solid ${strategy.contentType === opt ? "#e1306c" : "var(--border)"}`, background: strategy.contentType === opt ? "#e1306c12" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: strategy.contentType === opt ? "#e1306c" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Tone & Vibe</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["Inspirational", "Playful", "Educational", "Raw & Honest", "Bold", "Minimal"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("instagram", "tone", opt)}
                      style={{ padding: "9px", borderRadius: "7px", border: `2px solid ${strategy.tone === opt ? "#e1306c" : "var(--border)"}`, background: strategy.tone === opt ? "#e1306c12" : "var(--bg)", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: strategy.tone === opt ? "#e1306c" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Number of Hashtags</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["0", "5", "10", "20+"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("instagram", "hashtagCount", opt)}
                      style={{ padding: "9px", borderRadius: "7px", border: `2px solid ${strategy.hashtagCount === opt ? "#e1306c" : "var(--border)"}`, background: strategy.hashtagCount === opt ? "#e1306c12" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: strategy.hashtagCount === opt ? "#e1306c" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentPlatform === "facebook" && (
            <>
              <div>
                <label className="label">Post Style</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["Educational", "Promotional", "Story-driven", "Question / Poll"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("facebook", "postStyle", opt)}
                      style={{ padding: "10px", borderRadius: "8px", border: `2px solid ${strategy.postStyle === opt ? "#1877f2" : "var(--border)"}`, background: strategy.postStyle === opt ? "#1877f212" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: strategy.postStyle === opt ? "#1877f2" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Desired Audience Action</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["Like & Share", "Comment", "Click Link", "Tag a Friend", "Save Post", "Sign Up"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("facebook", "desiredAction", opt)}
                      style={{ padding: "9px", borderRadius: "7px", border: `2px solid ${strategy.desiredAction === opt ? "#1877f2" : "var(--border)"}`, background: strategy.desiredAction === opt ? "#1877f212" : "var(--bg)", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: strategy.desiredAction === opt ? "#1877f2" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentPlatform === "reddit" && (
            <>
              <div>
                <label className="label">Target Subreddits</label>
                <input className="input-field" style={{ width: "100%", marginTop: "8px" }}
                  placeholder="e.g. r/entrepreneur, r/SaaS, r/startups"
                  value={strategy.subreddits ?? ""}
                  onChange={e => updateStrategy("reddit", "subreddits", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Post Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
                  {["Discussion", "Show HN-style", "Story / Lesson"].map(opt => (
                    <button key={opt} onClick={() => updateStrategy("reddit", "postType", opt)}
                      style={{ padding: "10px", borderRadius: "8px", border: `2px solid ${strategy.postType === opt ? "#ff4500" : "var(--border)"}`, background: strategy.postType === opt ? "#ff450012" : "var(--bg)", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: strategy.postType === opt ? "#ff4500" : "var(--fg)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Value-First Angle</label>
                <textarea className="input-field" style={{ width: "100%", minHeight: "80px", marginTop: "8px", resize: "vertical" }}
                  placeholder="What insight or lesson will you lead with? e.g. 'Share a hard lesson from building in public'"
                  value={strategy.valueFirst ?? ""}
                  onChange={e => updateStrategy("reddit", "valueFirst", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {strategyStep < selected.length - 1 ? (
            <button className="btn btn-primary" style={{ flex: 1, padding: "12px" }} onClick={() => setStrategyStep(s => s + 1)}>
              Next: {PLATFORMS.find(p => p.id === selected[strategyStep + 1])?.label} <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1, padding: "12px" }} onClick={handleGenerate}>
              <Sparkles size={14} /> Generate Content
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────── Generating
  if (step === "generating") {
    return (
      <div style={{ padding: "32px", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Loader2 size={28} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--fg)", marginBottom: "8px" }}>Generating Content…</h2>
        <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
          AI is crafting tailored posts for {selected.join(", ")}. This takes about 15–30 seconds.
        </p>
        <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {selected.map((p) => {
            const info = PLATFORMS.find(x => x.id === p)!;
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: info.bg, display: "flex", alignItems: "center", justifyContent: "center", color: info.color }}>
                  <info.icon size={16} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--fg)" }}>Writing {info.label} post…</span>
                <Loader2 size={14} color={info.color} style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────── Done
  return (
    <div style={{ padding: "32px", maxWidth: "480px", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#16a34a18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "2px solid #16a34a40" }}>
        <Check size={28} color="#16a34a" />
      </div>
      <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--fg)", marginBottom: "8px" }}>Campaign Created! 🎉</h2>
      <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginBottom: "24px" }}>
        Generated <strong>{generatedCount}</strong> posts across {selected.length} platform{selected.length > 1 ? "s" : ""}.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button className="btn btn-primary" style={{ width: "100%", padding: "12px" }}
          onClick={() => router.push(`/dashboard/b2c/vault?campaign=${campaignId}`)}>
          View Posts in Vault
        </button>
        <button className="btn btn-secondary" style={{ width: "100%", padding: "12px" }}
          onClick={() => router.push("/dashboard/b2c/campaigns")}>
          Back to Campaigns
        </button>
      </div>
    </div>
  );
}
